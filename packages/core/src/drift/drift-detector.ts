import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { diffLines } from 'diff';
import type { Logger } from '../interfaces';

/**
 * Drift detection system for tracking changes between source and compiled rules.
 * Maintains a history of changes in JSONL format.
 */
export class DriftDetector {
  private logger: Logger;
  private historyPath: string;
  private enabled: boolean;
  
  constructor(options: {
    logger: Logger;
    historyPath?: string;
    enabled?: boolean;
  }) {
    this.logger = options.logger;
    this.historyPath = options.historyPath || '.rulesets/history.jsonl';
    this.enabled = options.enabled ?? true;
  }
  
  /**
   * Checks for drift between source and compiled files.
   */
  async checkDrift(options: {
    sourcePath: string;
    compiledPaths: Map<string, string>; // destination -> path
    sourceContent?: string;
  }): Promise<DriftReport> {
    if (!this.enabled) {
      return { hasDrift: false, drifts: [] };
    }
    
    const drifts: DriftEntry[] = [];
    const sourceContent = options.sourceContent || 
      await this.readFile(options.sourcePath);
    const sourceHash = this.calculateHash(sourceContent);
    
    for (const [destination, compiledPath] of options.compiledPaths) {
      try {
        const compiledContent = await this.readFile(compiledPath);
        const compiledHash = this.calculateHash(compiledContent);
        
        // Check if file exists in history
        const lastKnownHash = await this.getLastKnownHash(compiledPath);
        
        if (lastKnownHash && lastKnownHash !== compiledHash) {
          // File has been modified externally
          const diff = this.calculateDiff(
            await this.getLastKnownContent(compiledPath) || '',
            compiledContent
          );
          
          drifts.push({
            type: 'external-modification',
            destination,
            path: compiledPath,
            sourceHash,
            compiledHash,
            lastKnownHash,
            diff,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        // File doesn't exist yet, not a drift
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          this.logger.warn(`Failed to check drift for ${compiledPath}:`, error);
        }
      }
    }
    
    // Record the check in history
    if (drifts.length > 0) {
      await this.recordDrifts(drifts);
    }
    
    return {
      hasDrift: drifts.length > 0,
      drifts
    };
  }
  
  /**
   * Records a successful compilation (no drift).
   */
  async recordCompilation(options: {
    sourcePath: string;
    compiledPaths: Map<string, string>;
    sourceContent?: string;
  }): Promise<void> {
    if (!this.enabled) {
      return;
    }
    
    const sourceContent = options.sourceContent || 
      await this.readFile(options.sourcePath);
    const sourceHash = this.calculateHash(sourceContent);
    
    const entries: HistoryEntry[] = [];
    
    for (const [destination, compiledPath] of options.compiledPaths) {
      try {
        const compiledContent = await this.readFile(compiledPath);
        const compiledHash = this.calculateHash(compiledContent);
        
        entries.push({
          type: 'compilation',
          timestamp: new Date().toISOString(),
          source: {
            path: options.sourcePath,
            hash: sourceHash
          },
          compiled: {
            destination,
            path: compiledPath,
            hash: compiledHash
          }
        });
        
        // Store content snapshot for future drift detection
        await this.storeSnapshot(compiledPath, compiledContent, compiledHash);
      } catch (error) {
        this.logger.warn(`Failed to record compilation for ${compiledPath}:`, error);
      }
    }
    
    if (entries.length > 0) {
      await this.appendToHistory(entries);
    }
  }
  
  /**
   * Gets drift history for analysis.
   */
  async getDriftHistory(options: {
    limit?: number;
    since?: Date;
    destination?: string;
  } = {}): Promise<DriftEntry[]> {
    const { limit = 100, since, destination } = options;
    const history = await this.readHistory();
    
    let drifts = history
      .filter(entry => entry.type === 'drift')
      .map(entry => {
        // Reconstruct DriftEntry from stored HistoryEntry
        return {
          type: 'external-modification' as const,
          destination: entry.destination as string,
          path: entry.path as string,
          sourceHash: entry.sourceHash as string,
          compiledHash: entry.compiledHash as string,
          lastKnownHash: entry.lastKnownHash as string,
          diff: entry.diff as string,
          timestamp: entry.timestamp
        } as DriftEntry;
      });
    
    if (since) {
      drifts = drifts.filter(d => new Date(d.timestamp) >= since);
    }
    
    if (destination) {
      drifts = drifts.filter(d => d.destination === destination);
    }
    
    return drifts.slice(-limit);
  }
  
  /**
   * Reads a file safely.
   */
  private async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }
  
  /**
   * Calculates SHA-256 hash of content.
   */
  private calculateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  /**
   * Calculates diff between two contents.
   */
  private calculateDiff(oldContent: string, newContent: string): string {
    const diff = diffLines(oldContent, newContent);
    const lines: string[] = [];
    
    for (const part of diff) {
      const prefix = part.added ? '+' : part.removed ? '-' : ' ';
      const partLines = part.value.split('\n').filter(l => l);
      for (const line of partLines) {
        lines.push(`${prefix}${line}`);
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Gets the last known hash for a compiled file.
   */
  private async getLastKnownHash(compiledPath: string): Promise<string | null> {
    const snapshotPath = this.getSnapshotPath(compiledPath);
    
    try {
      const snapshot = await fs.readFile(snapshotPath, 'utf-8');
      const data = JSON.parse(snapshot);
      return data.hash;
    } catch {
      return null;
    }
  }
  
  /**
   * Gets the last known content for a compiled file.
   */
  private async getLastKnownContent(compiledPath: string): Promise<string | null> {
    const snapshotPath = this.getSnapshotPath(compiledPath);
    
    try {
      const snapshot = await fs.readFile(snapshotPath, 'utf-8');
      const data = JSON.parse(snapshot);
      return data.content;
    } catch {
      return null;
    }
  }
  
  /**
   * Stores a snapshot of compiled content.
   */
  private async storeSnapshot(
    compiledPath: string,
    content: string,
    hash: string
  ): Promise<void> {
    const snapshotPath = this.getSnapshotPath(compiledPath);
    const snapshotDir = path.dirname(snapshotPath);
    
    await fs.mkdir(snapshotDir, { recursive: true });
    
    const snapshot = {
      path: compiledPath,
      hash,
      content,
      timestamp: new Date().toISOString()
    };
    
    await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');
  }
  
  /**
   * Gets the snapshot path for a compiled file.
   */
  private getSnapshotPath(compiledPath: string): string {
    const hash = this.calculateHash(compiledPath);
    return path.join('.rulesets', 'snapshots', `${hash}.json`);
  }
  
  /**
   * Records drift entries.
   */
  private async recordDrifts(drifts: DriftEntry[]): Promise<void> {
    const entries: HistoryEntry[] = drifts.map(drift => ({
      type: 'drift' as const,
      timestamp: drift.timestamp,
      destination: drift.destination,
      path: drift.path,
      sourceHash: drift.sourceHash,
      compiledHash: drift.compiledHash,
      lastKnownHash: drift.lastKnownHash,
      diff: drift.diff
    }));
    
    await this.appendToHistory(entries);
  }
  
  /**
   * Appends entries to history file.
   */
  private async appendToHistory(entries: HistoryEntry[]): Promise<void> {
    const historyDir = path.dirname(this.historyPath);
    await fs.mkdir(historyDir, { recursive: true });
    
    const lines = entries.map(entry => JSON.stringify(entry));
    const content = lines.join('\n') + '\n';
    
    await fs.appendFile(this.historyPath, content, 'utf-8');
  }
  
  /**
   * Reads history file.
   */
  private async readHistory(): Promise<HistoryEntry[]> {
    try {
      const content = await fs.readFile(this.historyPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      return lines.map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }
}

// Type definitions
export interface DriftReport {
  hasDrift: boolean;
  drifts: DriftEntry[];
}

export interface DriftEntry {
  type: 'external-modification';
  destination: string;
  path: string;
  sourceHash: string;
  compiledHash: string;
  lastKnownHash: string;
  diff: string;
  timestamp: string;
}

interface HistoryEntry {
  type: 'compilation' | 'drift';
  timestamp: string;
  [key: string]: unknown;
}