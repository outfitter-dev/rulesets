/**

- @fileoverview File system service interface
-
- Provides secure file operations with path validation, permission checking,
- and comprehensive error handling. All operations use branded types for
- compile-time safety and runtime validation.
 */

import type { SandboxError } from '@/domain/errors';
import type {
  CompiledContent,
  SafeDirectoryPath,
  SafeFilePath,
  SourceContent,
  Timestamp,
} from '@/shared/types/brands';
import type { Result } from '@/shared/types/result';

/**

- File encoding types supported by the file system service
 */
export type FileEncoding = 'utf8' | 'utf16le' | 'ascii' | 'binary' | 'base64';

/**

- File system permissions
 */
export interface FilePermissions {
  /**Whether the file/directory is readable*/
  readonly readable: boolean;

  /** Whether the file/directory is writable */
  readonly writable: boolean;

  /** Whether the directory is executable (can be traversed) */
  readonly executable: boolean;

  /** Numeric permission mode (e.g., 0o755) */
  readonly mode: number;

  /** Owner user ID */
  readonly uid: number;

  /** Group ID */
  readonly gid: number;
}

/**

- File metadata information
 */
export interface FileMetadata {
  /**File path*/
  readonly path: SafeFilePath;

  /** File size in bytes */
  readonly sizeBytes: number;

  /** File permissions */
  readonly permissions: FilePermissions;

  /** Creation timestamp */
  readonly createdAt: Timestamp;

  /** Last modified timestamp */
  readonly modifiedAt: Timestamp;

  /** Last accessed timestamp */
  readonly accessedAt: Timestamp;

  /** Whether this is a file */
  readonly isFile: boolean;

  /** Whether this is a directory */
  readonly isDirectory: boolean;

  /** Whether this is a symbolic link */
  readonly isSymbolicLink: boolean;

  /** MIME type (if detectable) */
  readonly mimeType?: string;

  /** MD5 checksum of file content (for files only) */
  readonly checksum?: string;
}

/**

- Directory listing entry
 */
export interface DirectoryEntry {
  /**Entry name*/
  readonly name: string;

  /** Full path to the entry */
  readonly path: SafeFilePath;

  /** Whether this entry is a file */
  readonly isFile: boolean;

  /** Whether this entry is a directory */
  readonly isDirectory: boolean;

  /** Whether this entry is a symbolic link */
  readonly isSymbolicLink: boolean;

  /** File size in bytes (for files) */
  readonly sizeBytes?: number;

  /** Last modified timestamp */
  readonly modifiedAt: Timestamp;
}

/**

- Options for reading files
 */
export interface ReadFileOptions {
  /**File encoding (defaults to 'utf8')*/
  readonly encoding?: FileEncoding;

  /** Whether to validate file exists before reading */
  readonly validateExists?: boolean;

  /** Maximum file size to read in bytes */
  readonly maxSizeBytes?: number;

  /** Whether to compute checksum while reading */
  readonly computeChecksum?: boolean;
}

/**

- Options for writing files
 */
export interface WriteFileOptions {
  /**File encoding (defaults to 'utf8')*/
  readonly encoding?: FileEncoding;

  /** File permissions to set (defaults to 0o644) */
  readonly mode?: number;

  /** Whether to create parent directories if they don't exist */
  readonly createParents?: boolean;

  /** Whether to create a backup of existing file */
  readonly createBackup?: boolean;

  /** Whether to ensure atomic write operation */
  readonly atomic?: boolean;

  /** Whether to flush changes to disk immediately */
  readonly sync?: boolean;
}

/**

- Options for copying files
 */
export interface CopyFileOptions {
  /**Whether to overwrite destination if it exists*/
  readonly overwrite?: boolean;

  /** Whether to preserve file metadata */
  readonly preserveMetadata?: boolean;

  /** Whether to create parent directories of destination */
  readonly createParents?: boolean;

  /** Whether to create a backup of destination if it exists */
  readonly createBackup?: boolean;
}

/**

- Options for listing directories
 */
export interface ListDirectoryOptions {
  /**Whether to include hidden files (starting with .)*/
  readonly includeHidden?: boolean;

  /** Whether to list recursively */
  readonly recursive?: boolean;

  /** Maximum depth for recursive listing */
  readonly maxDepth?: number;

  /** Glob pattern to filter entries */
  readonly pattern?: string;

  /** Whether to include file metadata */
  readonly includeMetadata?: boolean;

  /** Sort order for entries */
  readonly sortBy?: 'name' | 'size' | 'modified';
  readonly sortOrder?: 'asc' | 'desc';
}

/**

- Options for creating directories
 */
export interface CreateDirectoryOptions {
  /**Whether to create parent directories if they don't exist*/
  readonly recursive?: boolean;

  /** Directory permissions (defaults to 0o755) */
  readonly mode?: number;

  /** Whether to ignore error if directory already exists */
  readonly ignoreExists?: boolean;
}

/**

- Options for deleting files/directories
 */
export interface DeleteOptions {
  /**Whether to delete recursively (for directories)*/
  readonly recursive?: boolean;

  /** Whether to force deletion (ignore permission errors) */
  readonly force?: boolean;

  /** Whether to create backup before deletion */
  readonly createBackup?: boolean;

  /** Maximum age of files to delete (in milliseconds) */
  readonly maxAgeMs?: number;
}

/**

- Options for watching files/directories for changes
 */
export interface WatchOptions {
  /**Whether to watch recursively*/
  readonly recursive?: boolean;

  /** Debounce delay in milliseconds */
  readonly debounceMs?: number;

  /** File patterns to include */
  readonly include?: readonly string[];

  /** File patterns to exclude */
  readonly exclude?: readonly string[];
}

/**

- File system change event
 */
export interface FileSystemChangeEvent {
  /**Type of change*/
  readonly type: 'created' | 'modified' | 'deleted' | 'renamed';

  /** Path that changed */
  readonly path: SafeFilePath;

  /** Previous path (for rename events) */
  readonly previousPath?: SafeFilePath;

  /** Timestamp when change occurred */
  readonly timestamp: Timestamp;

  /** Additional metadata about the change */
  readonly metadata: Record<string, unknown>;
}

/**

- File system watcher interface
 */
export interface IFileSystemWatcher {
  /**Adds a path to watch*/
  watch(
    path: SafeFilePath | SafeDirectoryPath,
    options?: WatchOptions
  ): Result<void, SandboxError>;

  /** Removes a path from watching */
  unwatch(path: SafeFilePath | SafeDirectoryPath): Result<void, SandboxError>;

  /** Stops all watching */
  close(): Promise<Result<void, SandboxError>>;

  /** Event emitter for file system changes */
  on(event: 'change', listener: (event: FileSystemChangeEvent) => void): void;
  off(event: 'change', listener: (event: FileSystemChangeEvent) => void): void;
}

/**

- Secure file system service interface
-
- Provides type-safe file operations with comprehensive security validation,
- path sanitization, and permission checking. All paths are validated through
- branded types to prevent directory traversal and other security issues.
-
- @template TContent - Content type constraint for file operations
 */
export interface IFileSystemService<TContent extends string = string> {
  /**
  - Checks if a file or directory exists
  -
  - @param path - Path to check
  - @returns Promise resolving to true if exists, false otherwise
  -
  - @example

  - ```typescript
  - const result = await fileSystem.exists(createSafeFilePath('src/rules.rule.md'));
  - if (result.success && result.value) {
  - console.log('File exists');
  - }

  - ```

   */
  exists(
    path: SafeFilePath | SafeDirectoryPath
  ): Promise<Result<boolean, SandboxError>>;

  /**

- Gets metadata for a file or directory
-
- @param path - Path to get metadata for
- @returns Promise resolving to file metadata or error
   */
  getMetadata(
    path: SafeFilePath | SafeDirectoryPath
  ): Promise<Result<FileMetadata, SandboxError>>;

  /**

- Reads the complete contents of a file
-
- @param path - Path to the file to read
- @param options - Options for reading the file
- @returns Promise resolving to file contents or error
-
- @example

- ```typescript
- const result = await fileSystem.readFile(
- createSafeFilePath('src/rules.rule.md'),
- { encoding: 'utf8', maxSizeBytes: 1_000_000 }
- );
-
- if (result.success) {
- console.log('File content:', result.value);
- } else {
- console.error('Failed to read file:', result.error.getUserMessage());
- }

- ```

   */
  readFile(
    path: SafeFilePath,
    options?: ReadFileOptions
  ): Promise<Result<TContent, SandboxError>>;

  /**

- Writes content to a file
-
- @param path - Path where to write the file
- @param content - Content to write
- @param options - Options for writing the file
- @returns Promise resolving to success or error
-
- @example

- ```typescript
- const result = await fileSystem.writeFile(
- createSafeFilePath('.cursor/rules.mdc'),
- createCompiledContent(compiledRules),
- { createParents: true, atomic: true }
- );
-
- if (!result.success) {
- console.error('Failed to write file:', result.error.getUserMessage());
- }

- ```

   */
  writeFile(
    path: SafeFilePath,
    content: TContent,
    options?: WriteFileOptions
  ): Promise<Result<void, SandboxError>>;

  /**

- Copies a file from source to destination
-
- @param sourcePath - Source file path
- @param destinationPath - Destination file path
- @param options - Options for copying
- @returns Promise resolving to success or error
   */
  copyFile(
    sourcePath: SafeFilePath,
    destinationPath: SafeFilePath,
    options?: CopyFileOptions
  ): Promise<Result<void, SandboxError>>;

  /**

- Moves/renames a file or directory
-
- @param sourcePath - Current path
- @param destinationPath - New path
- @returns Promise resolving to success or error
   */
  moveFile(
    sourcePath: SafeFilePath | SafeDirectoryPath,
    destinationPath: SafeFilePath | SafeDirectoryPath
  ): Promise<Result<void, SandboxError>>;

  /**

- Deletes a file
-
- @param path - Path to the file to delete
- @param options - Options for deletion
- @returns Promise resolving to success or error
   */
  deleteFile(
    path: SafeFilePath,
    options?: DeleteOptions
  ): Promise<Result<void, SandboxError>>;

  /**

- Creates a directory
-
- @param path - Path of the directory to create
- @param options - Options for directory creation
- @returns Promise resolving to success or error
-
- @example

- ```typescript
- const result = await fileSystem.createDirectory(
- createSafeDirectoryPath('.cursor/'),
- { recursive: true, mode: 0o755 }
- );

- ```

   */
  createDirectory(
    path: SafeDirectoryPath,
    options?: CreateDirectoryOptions
  ): Promise<Result<void, SandboxError>>;

  /**

- Lists contents of a directory
-
- @param path - Path to the directory to list
- @param options - Options for listing
- @returns Promise resolving to directory entries or error
-
- @example

- ```typescript
- const result = await fileSystem.listDirectory(
- createSafeDirectoryPath('src/'),
- { includeHidden: false, sortBy: 'name' }
- );
-
- if (result.success) {
- for (const entry of result.value) {
-     console.log(`${entry.isFile ? 'F' : 'D'} ${entry.name}`);
- }
- }

- ```

   */
  listDirectory(
    path: SafeDirectoryPath,
    options?: ListDirectoryOptions
  ): Promise<Result<readonly DirectoryEntry[], SandboxError>>;

  /**

- Deletes a directory
-
- @param path - Path to the directory to delete
- @param options - Options for deletion
- @returns Promise resolving to success or error
   */
  deleteDirectory(
    path: SafeDirectoryPath,
    options?: DeleteOptions
  ): Promise<Result<void, SandboxError>>;

  /**

- Checks if the current process has specific permissions for a path
-
- @param path - Path to check permissions for
- @param permissions - Permissions to check ('read', 'write', 'execute')
- @returns Promise resolving to permission check results
   */
  checkPermissions(
    path: SafeFilePath | SafeDirectoryPath,
    permissions: readonly ('read' | 'write' | 'execute')[]
  ): Promise<Result<Record<string, boolean>, SandboxError>>;

  /**

- Changes permissions for a file or directory
-
- @param path - Path to change permissions for
- @param mode - New permission mode
- @returns Promise resolving to success or error
   */
  changePermissions(
    path: SafeFilePath | SafeDirectoryPath,
    mode: number
  ): Promise<Result<void, SandboxError>>;

  /**

- Resolves a path to its absolute canonical form
-
- @param path - Path to resolve
- @returns Promise resolving to the canonical path or error
   */
  resolvePath(
    path: SafeFilePath | SafeDirectoryPath
  ): Promise<Result<SafeFilePath, SandboxError>>;

  /**

- Creates a file system watcher for monitoring changes
-
- @returns Promise resolving to a file system watcher instance
   */
  createWatcher(): Promise<Result<IFileSystemWatcher, SandboxError>>;

  /**

- Cleans up temporary files and caches
-
- @param olderThanMs - Clean up files older than this many milliseconds
- @returns Promise resolving to number of cleaned up items
   */
  cleanup(olderThanMs?: number): Promise<Result<number, SandboxError>>;

  /**

- Gets file system statistics and health information
-
- @returns Promise resolving to file system health status
   */
  getHealthStatus(): Promise<Result<FileSystemHealth, SandboxError>>;
}

/**

- Health status information for the file system service
 */
export interface FileSystemHealth {
  /**Whether the file system is healthy*/
  readonly healthy: boolean;

  /** Available disk space in bytes */
  readonly availableSpaceBytes: number;

  /** Total disk space in bytes */
  readonly totalSpaceBytes: number;

  /** Used disk space in bytes */
  readonly usedSpaceBytes: number;

  /** Number of cached files */
  readonly cachedFiles: number;

  /** Cache size in bytes */
  readonly cacheSizeBytes: number;

  /** Number of active file watchers */
  readonly activeWatchers: number;

  /** Average file operation time in milliseconds */
  readonly averageOperationTimeMs: number;

  /** Any health warnings */
  readonly warnings: readonly string[];

  /** Additional diagnostic information */
  readonly diagnostics: Record<string, unknown>;
}

/**

- Type alias for standard file system service with string content
 */
export type FileSystemService = IFileSystemService<
  SourceContent | CompiledContent

>;

/**

- Type alias for source content file system service
 */
export type SourceFileSystemService = IFileSystemService<SourceContent>;

/**

- Type alias for compiled content file system service
 */
export type CompiledFileSystemService = IFileSystemService<CompiledContent>;
