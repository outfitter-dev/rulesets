// TLDR: Type definitions for branch-diffs package

export interface BranchComparison {
  /** Target branch being compared against */
  target: string;
  /** Branch being compared */
  branch: string;
  /** Summary statistics of the diff */
  stats: {
    /** Total files changed */
    filesChanged: number;
    /** Total insertions */
    insertions: number;
    /** Total deletions */
    deletions: number;
    /** Raw git diff --stat output */
    rawStats: string;
  };
  /** Full patch diff content */
  patch: string;
  /** Metadata about the comparison */
  metadata: {
    /** When this comparison was generated */
    timestamp: string;
    /** Git commit hash of target branch */
    targetCommit: string;
    /** Git commit hash of comparison branch */
    branchCommit: string;
    /** Exclude patterns used */
    excludePatterns: string[];
  };
}

export interface DiffReport {
  /** Overall report metadata */
  metadata: {
    /** When this report was generated */
    generatedAt: string;
    /** Target branch all comparisons are against */
    target: string;
    /** List of branches compared */
    branches: string[];
    /** Configuration used for this report */
    config: {
      excludePatterns: string[];
      contextLines?: number;
      includeBinary?: boolean;
    };
  };
  /** Individual branch comparisons */
  comparisons: BranchComparison[];
  /** Summary across all comparisons */
  summary: {
    /** Total branches compared */
    totalBranches: number;
    /** Total files changed across all branches */
    totalFilesChanged: number;
    /** Total lines added across all branches */
    totalInsertions: number;
    /** Total lines deleted across all branches */
    totalDeletions: number;
  };
}