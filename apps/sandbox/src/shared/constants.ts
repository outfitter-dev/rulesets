/**

- @fileoverview Shared constants for the Rulesets Sandbox application
-
- Centralized location for magic numbers and commonly used values
- to improve maintainability and type safety.
 */

/**

- Performance-related constants
 */
export const PERFORMANCE_CONSTANTS = {
  /**Multiplier for moderate complexity operations time estimation*/
  MODERATE_COMPLEXITY_TIME_MULTIPLIER: 3,
  
  /** Multiplier for complex operations time estimation */
  COMPLEX_COMPLEXITY_TIME_MULTIPLIER: 10,
  
  /** Default maximum cache size in bytes (50MB) */
  DEFAULT_MAX_CACHE_SIZE_BYTES: 50* 1024 * 1024,
} as const;

/**

- Memory and file size constants (in bytes)
 */
export const MEMORY_CONSTANTS = {
  /**1 KB in bytes*/
  KILOBYTE: 1024,
  
  /** 1 MB in bytes */
  MEGABYTE: 1024* 1024,
  
  /** 1 GB in bytes */
  GIGABYTE: 1024* 1024 * 1024,
  
  /** Default small cache size (10MB) */
  SMALL_CACHE_SIZE: 10* 1024 * 1024,
  
  /** Default medium cache size (50MB) */
  MEDIUM_CACHE_SIZE: 50* 1024 * 1024,
  
  /** Default large cache size (100MB) */
  LARGE_CACHE_SIZE: 100* 1024 * 1024,
} as const;

/**

- Security-related constants
 */
export const SECURITY_CONSTANTS = {
  /**Maximum file size for development (50MB)*/
  MAX_FILE_SIZE_DEV: 50 *1024* 1024,
  
  /** Maximum file size for production (10MB) */
  MAX_FILE_SIZE_PROD: 10* 1024 * 1024,
  
  /** Maximum output size (50MB) */
  MAX_OUTPUT_SIZE: 50* 1024 * 1024,
  
  /** Default memory limit for development (1GB) */
  MEMORY_LIMIT_DEV: 1024* 1024 * 1024,
  
  /** Default memory limit for production (512MB) */
  MEMORY_LIMIT_PROD: 512* 1024 * 1024,
} as const;

/**

- Time-related constants (in milliseconds)
 */
export const TIME_CONSTANTS = {
  /**One second in milliseconds*/
  SECOND: 1000,
  
  /** One minute in milliseconds */
  MINUTE: 60* 1000,
  
  /** One hour in milliseconds */
  HOUR: 60* 60 * 1000,
  
  /** One day in milliseconds */
  DAY: 24* 60 *60* 1000,
  
  /** One week in milliseconds */
  WEEK: 7* 24 *60* 60 * 1000,
} as const;

/**

- Type exports for constant values
 */
export type PerformanceConstantsType = typeof PERFORMANCE_CONSTANTS;
export type MemoryConstantsType = typeof MEMORY_CONSTANTS;
export type SecurityConstantsType = typeof SECURITY_CONSTANTS;
export type TimeConstantsType = typeof TIME_CONSTANTS;
