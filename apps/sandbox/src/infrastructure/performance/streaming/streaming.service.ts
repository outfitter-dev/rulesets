/**

- @fileoverview StreamingService implementation
-
- Provides memory-efficient streaming operations for large files
- with progress tracking, chunked processing, and backpressure handling.
 */

import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, promises as fs } from 'node:fs';
import { pipeline, Readable, Transform, Writable } from 'node:stream';
import { promisify } from 'node:util';
import { ErrorCodes, SandboxError } from '@/domain/errors';
import type {
  CompiledContent,
  SafeFilePath,
  SourceContent,
} from '@/shared/types/brands';
import { Err, Ok, type Result } from '@/shared/types/result';
import type { PerformanceMonitor } from '../monitoring/performance.monitor';

const pipelineAsync = promisify(pipeline);

/**

- Streaming operation configuration
 */
export interface StreamConfig {
  /**Chunk size in bytes */
  readonly chunkSize: number;
  /** High water mark for streams */
  readonly highWaterMark: number;
  /**Enable progress tracking */
  readonly enableProgress: boolean;
  /** Enable checksum calculation */
  readonly enableChecksum: boolean;
  /**Stream timeout in milliseconds */
  readonly timeoutMs: number;
  /** Maximum file size in bytes */
  readonly maxFileSize: number;
}

/**

- Stream progress information
 */
export interface StreamProgress {
  readonly bytesProcessed: number;
  readonly totalBytes: number;
  readonly percentage: number;
  readonly startTime: number;
  readonly currentTime: number;
  readonly estimatedTimeRemaining: number;
  readonly bytesPerSecond: number;
}

/**

- Stream operation result
 */
export interface StreamResult {
  readonly success: boolean;
  readonly bytesProcessed: number;
  readonly processingTimeMs: number;
  readonly checksum?: string;
  readonly error?: Error;
}

/**

- Batch operation configuration
 */
export interface BatchConfig {
  /**Maximum concurrent streams */
  readonly maxConcurrency: number;
  /** Continue on individual file errors */
  readonly continueOnError: boolean;
  /**Progress callback for batch operations*/
  readonly onProgress?: (completed: number, total: number) => void;
}

/**

- File chunk for processing
 */
export interface FileChunk {
  readonly data: Buffer;
  readonly index: number;
  readonly isLast: boolean;
  readonly offset: number;
}

/**

- Streaming error for streaming-specific operations
 */
class StreamingError extends SandboxError {
  constructor(
    code: string,
    message: string,
    context: Record<string, unknown> = {},
    cause?: Error
  ) {
    super(code, message, 'streaming', 'error', context, [], cause);
  }
}

/**

- Progress tracking transform stream
 */
class ProgressTracker extends Transform {
  private bytesProcessed = 0;
  private readonly startTime = Date.now();

  constructor(
    private readonly totalBytes: number,
    private readonly onProgress: (progress: StreamProgress) => void,
    options = {}
  ) {
    super(options);
  }

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: Function
  ): void {
    this.bytesProcessed += chunk.length;

    const currentTime = Date.now();
    const elapsedTime = currentTime - this.startTime;
    const percentage = (this.bytesProcessed / this.totalBytes) *100;
    const bytesPerSecond =
      elapsedTime > 0 ? (this.bytesProcessed / elapsedTime)* 1000 : 0;
    const remainingBytes = this.totalBytes - this.bytesProcessed;
    const estimatedTimeRemaining =
      bytesPerSecond > 0 ? (remainingBytes / bytesPerSecond) * 1000 : 0;

    this.onProgress({
      bytesProcessed: this.bytesProcessed,
      totalBytes: this.totalBytes,
      percentage,
      startTime: this.startTime,
      currentTime,
      estimatedTimeRemaining,
      bytesPerSecond,
    });

    this.push(chunk);
    callback();
  }
}

/**

- Checksum calculation transform stream
 */
class ChecksumCalculator extends Transform {
  private readonly hash = createHash('sha256');

  constructor(options = {}) {
    super(options);
  }

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: Function
  ): void {
    this.hash.update(chunk);
    this.push(chunk);
    callback();
  }

  _flush(callback: Function): void {
    this.emit('checksum', this.hash.digest('hex'));
    callback();
  }

  getChecksum(): string {
    return this.hash.digest('hex');
  }
}

/**

- Chunked file processor
 */
class ChunkedProcessor extends Transform {
  private chunkIndex = 0;
  private offset = 0;

  constructor(
    private readonly chunkSize: number,
    private readonly onChunk: (chunk: FileChunk) => Promise<void>,
    options = {}
  ) {
    super({ ...options, objectMode: false });
  }

  async _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: Function
  ): Promise<void> {
    try {
      let position = 0;

      while (position < chunk.length) {
        const remainingInChunk = Math.min(
          this.chunkSize,
          chunk.length - position
        );
        const chunkData = chunk.subarray(position, position + remainingInChunk);

        const fileChunk: FileChunk = {
          data: chunkData,
          index: this.chunkIndex++,
          isLast: false, // Will be set in _flush if this is the last chunk
          offset: this.offset,
        };

        await this.onChunk(fileChunk);

        position += remainingInChunk;
        this.offset += remainingInChunk;
      }

      this.push(chunk);
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

/**

- High-performance streaming service with memory-efficient operations
 */
export class StreamingService {
  private readonly config: StreamConfig;
  private readonly monitor?: PerformanceMonitor;

  constructor(
    config: Partial<StreamConfig> = {},
    monitor?: PerformanceMonitor
  ) {
    this.config = {
      chunkSize: 64 *1024, // 64KB chunks
      highWaterMark: 16* 1024, // 16KB buffer
      enableProgress: true,
      enableChecksum: false,
      timeoutMs: 300_000, // 5 minutes
      maxFileSize: 100 *1024* 1024, // 100MB
      ...config,
    };

    this.monitor = monitor;
  }

  /**

- Stream file content with progress tracking
   */
  async streamFile(
    filePath: SafeFilePath,
    onProgress?: (progress: StreamProgress) => void
  ): Promise<Result<AsyncIterable<Buffer>, SandboxError>> {
    try {
      // Validate file exists and get size
      const stats = await fs.stat(filePath);

      if (stats.size > this.config.maxFileSize) {
        return Err(
          new StreamingError(
            ErrorCodes.FILE_TOO_LARGE,
            `File too large: ${stats.size} bytes (max: ${this.config.maxFileSize})`,
            { filePath, fileSize: stats.size, maxSize: this.config.maxFileSize }
          )
        );
      }

      const totalBytes = stats.size;
      let bytesRead = 0;
      const startTime = Date.now();

      const stream = createReadStream(filePath, {
        highWaterMark: this.config.highWaterMark,
      });

      // Create async iterator
      const iterator = {
        async *[Symbol.asyncIterator]() {
          for await (const chunk of stream) {
            bytesRead += chunk.length;

            if (onProgress && this.config.enableProgress) {
              const currentTime = Date.now();
              const elapsedTime = currentTime - startTime;
              const percentage = (bytesRead / totalBytes) * 100;
              const bytesPerSecond =
                elapsedTime > 0 ? (bytesRead / elapsedTime) * 1000 : 0;
              const remainingBytes = totalBytes - bytesRead;
              const estimatedTimeRemaining =
                bytesPerSecond > 0
                  ? (remainingBytes / bytesPerSecond) * 1000
                  : 0;

              onProgress({
                bytesProcessed: bytesRead,
                totalBytes,
                percentage,
                startTime,
                currentTime,
                estimatedTimeRemaining,
                bytesPerSecond,
              });
            }

            yield chunk as Buffer;
          }
        },
      };

      this.recordMetric('stream_file_start', 1);
      return Ok(iterator);
    } catch (error) {
      return Err(
        new StreamingError(
          ErrorCodes.FILE_READ_FAILED,
          `Failed to stream file: ${(error as Error).message}`,
          { filePath },
          error as Error
        )
      );
    }
  }

  /**

- Copy file with streaming and progress tracking
   */
  async copyFileStream(
    sourcePath: SafeFilePath,
    destinationPath: SafeFilePath,
    onProgress?: (progress: StreamProgress) => void
  ): Promise<Result<StreamResult, SandboxError>> {
    try {
      const startTime = Date.now();

      // Get source file size
      const stats = await fs.stat(sourcePath);
      const totalBytes = stats.size;

      if (totalBytes > this.config.maxFileSize) {
        return Err(
          new StreamingError(
            ErrorCodes.FILE_TOO_LARGE,
            `File too large for streaming: ${totalBytes} bytes`,
            { sourcePath, fileSize: totalBytes }
          )
        );
      }

      const readStream = createReadStream(sourcePath, {
        highWaterMark: this.config.highWaterMark,
      });

      const writeStream = createWriteStream(destinationPath, {
        highWaterMark: this.config.highWaterMark,
      });

      const transforms: Transform[] = [];
      let checksum: string | undefined;

      // Add progress tracking
      if (onProgress && this.config.enableProgress) {
        transforms.push(new ProgressTracker(totalBytes, onProgress));
      }

      // Add checksum calculation
      if (this.config.enableChecksum) {
        const checksumCalculator = new ChecksumCalculator();
        checksumCalculator.on('checksum', (hash: string) => {
          checksum = hash;
        });
        transforms.push(checksumCalculator);
      }

      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Stream timeout after ${this.config.timeoutMs}ms`));
        }, this.config.timeoutMs);
      });

      // Execute pipeline with timeout
      const pipelinePromise = pipelineAsync(
        readStream,
        ...transforms,
        writeStream
      );

      await Promise.race([pipelinePromise, timeoutPromise]);

      const endTime = Date.now();
      const result: StreamResult = {
        success: true,
        bytesProcessed: totalBytes,
        processingTimeMs: endTime - startTime,
        checksum,
      };

      this.recordMetric('stream_copy_success', 1);
      this.recordMetric('stream_copy_time', result.processingTimeMs, 'ms');
      this.recordMetric('stream_copy_bytes', totalBytes, 'bytes');

      return Ok(result);
    } catch (error) {
      const result: StreamResult = {
        success: false,
        bytesProcessed: 0,
        processingTimeMs: Date.now() - Date.now(),
        error: error as Error,
      };

      this.recordMetric('stream_copy_error', 1);

      return Err(
        new StreamingError(
          ErrorCodes.FILE_WRITE_FAILED,
          `Stream copy failed: ${(error as Error).message}`,
          { sourcePath, destinationPath },
          error as Error
        )
      );
    }
  }

  /**

- Process file in chunks with custom processor
   */
  async processFileInChunks(
    filePath: SafeFilePath,
    processor: (chunk: FileChunk) => Promise<void>,
    onProgress?: (progress: StreamProgress) => void
  ): Promise<Result<StreamResult, SandboxError>> {
    try {
      const startTime = Date.now();

      // Get file size
      const stats = await fs.stat(filePath);
      const totalBytes = stats.size;
      let bytesProcessed = 0;

      const readStream = createReadStream(filePath, {
        highWaterMark: this.config.highWaterMark,
      });

      const transforms: Transform[] = [];

      // Add progress tracking
      if (onProgress && this.config.enableProgress) {
        transforms.push(new ProgressTracker(totalBytes, onProgress));
      }

      // Add chunk processor
      const chunkedProcessor = new ChunkedProcessor(
        this.config.chunkSize,
        async (chunk: FileChunk) => {
          await processor(chunk);
          bytesProcessed += chunk.data.length;
        }
      );
      transforms.push(chunkedProcessor);

      // Create null writable stream (we're processing, not writing)
      const nullStream = new Writable({
        write(chunk, encoding, callback) {
          callback();
        },
      });

      // Execute pipeline
      await pipelineAsync(readStream, ...transforms, nullStream);

      const endTime = Date.now();
      const result: StreamResult = {
        success: true,
        bytesProcessed,
        processingTimeMs: endTime - startTime,
      };

      this.recordMetric('stream_process_success', 1);
      this.recordMetric('stream_process_time', result.processingTimeMs, 'ms');

      return Ok(result);
    } catch (error) {
      return Err(
        new StreamingError(
          ErrorCodes.FILE_READ_FAILED,
          `Chunk processing failed: ${(error as Error).message}`,
          { filePath },
          error as Error
        )
      );
    }
  }

  /**

- Batch copy multiple files with concurrency control
   */
  async batchCopyFiles(
    operations: Array<{ source: SafeFilePath; destination: SafeFilePath }>,
    config: Partial<BatchConfig> = {}
  ): Promise<Result<StreamResult[], SandboxError>> {
    try {
      const batchConfig: BatchConfig = {
        maxConcurrency: 3,
        continueOnError: true,
        ...config,
      };

      const results: StreamResult[] = [];
      const errors: Error[] = [];
      let completed = 0;

      // Process in batches with concurrency control
      for (let i = 0; i < operations.length; i += batchConfig.maxConcurrency) {
        const batch = operations.slice(i, i + batchConfig.maxConcurrency);

        const batchPromises = batch.map(async (op) => {
          try {
            const result = await this.copyFileStream(op.source, op.destination);

            if (result.success) {
              results.push(result.value);
            } else {
              errors.push(result.error);
              if (!batchConfig.continueOnError) {
                throw result.error;
              }
            }
          } catch (error) {
            errors.push(error as Error);
            if (!batchConfig.continueOnError) {
              throw error;
            }
          } finally {
            completed++;
            if (batchConfig.onProgress) {
              batchConfig.onProgress(completed, operations.length);
            }
          }
        });

        await Promise.all(batchPromises);
      }

      if (errors.length > 0 && !batchConfig.continueOnError) {
        return Err(
          new StreamingError(
            ErrorCodes.BATCH_OPERATION_FAILED,
            `Batch copy failed with ${errors.length} errors`,
            { errorCount: errors.length, totalOperations: operations.length }
          )
        );
      }

      this.recordMetric('stream_batch_copy', operations.length);
      return Ok(results);
    } catch (error) {
      return Err(
        new StreamingError(
          ErrorCodes.INTERNAL_ERROR,
          `Batch copy failed: ${(error as Error).message}`,
          { operationCount: operations.length },
          error as Error
        )
      );
    }
  }

  /**

- Create readable stream from string content
   */
  createContentStream(content: SourceContent | CompiledContent): Readable {
    const chunks: Buffer[] = [];
    const contentBuffer = Buffer.from(content, 'utf8');

    // Split into chunks
    for (let i = 0; i < contentBuffer.length; i += this.config.chunkSize) {
      const chunk = contentBuffer.subarray(i, i + this.config.chunkSize);
      chunks.push(chunk);
    }

    let chunkIndex = 0;

    return new Readable({
      highWaterMark: this.config.highWaterMark,
      read() {
        if (chunkIndex < chunks.length) {
          this.push(chunks[chunkIndex++]);
        } else {
          this.push(null); // End of stream
        }
      },
    });
  }

  /**

- Convert stream to string content
   */
  async streamToContent(
    stream: Readable
  ): Promise<Result<string, SandboxError>> {
    try {
      const chunks: Buffer[] = [];
      let totalSize = 0;

      for await (const chunk of stream) {
        const buffer = chunk as Buffer;
        totalSize += buffer.length;

        if (totalSize > this.config.maxFileSize) {
          return Err(
            new StreamingError(
              ErrorCodes.FILE_TOO_LARGE,
              `Stream content too large: ${totalSize} bytes`,
              { maxSize: this.config.maxFileSize }
            )
          );
        }

        chunks.push(buffer);
      }

      const content = Buffer.concat(chunks).toString('utf8');
      this.recordMetric('stream_to_content', totalSize, 'bytes');

      return Ok(content);
    } catch (error) {
      return Err(
        new StreamingError(
          ErrorCodes.INTERNAL_ERROR,
          `Stream to content failed: ${(error as Error).message}`,
          {},
          error as Error
        )
      );
    }
  }

  /**

- Calculate file checksum using streaming
   */
  async calculateChecksum(
    filePath: SafeFilePath
  ): Promise<Result<string, SandboxError>> {
    try {
      const readStream = createReadStream(filePath, {
        highWaterMark: this.config.highWaterMark,
      });

      const hash = createHash('sha256');

      for await (const chunk of readStream) {
        hash.update(chunk);
      }

      const checksum = hash.digest('hex');
      this.recordMetric('stream_checksum', 1);

      return Ok(checksum);
    } catch (error) {
      return Err(
        new StreamingError(
          ErrorCodes.FILE_READ_FAILED,
          `Checksum calculation failed: ${(error as Error).message}`,
          { filePath },
          error as Error
        )
      );
    }
  }

  /**

- Get streaming configuration
   */
  getConfig(): StreamConfig {
    return { ...this.config };
  }

  /**

- Record performance metric
   */
  private recordMetric(
    name: string,
    value: number,
    unit: 'ms' | 'bytes' | 'count' = 'count'
  ): void {
    if (this.monitor) {
      this.monitor.record(name, value, unit, { streaming: true });
    }
  }
}
