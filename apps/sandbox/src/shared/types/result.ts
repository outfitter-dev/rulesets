/**

- @fileoverview Type-safe Result pattern for error handling
-
- Provides a Railway Oriented Programming approach to error handling,
- eliminating the need for try/catch blocks and making error handling
- explicit and type-safe. Inspired by Rust's Result<T, E> type.
 */

/**

- Represents the success case of an operation
 */
export interface Ok<T> {
  readonly success: true;
  readonly value: T;
  readonly error?: never;
}

/**

- Represents the failure case of an operation
 */
export interface Err<E> {
  readonly success: false;
  readonly error: E;
  readonly value?: never;
}

/**

- Result type that can be either Ok with a value or Err with an error
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**

- Creates a successful Result containing a value
 */
export function Ok<T>(value: T): Ok<T> {
  return {
    success: true,
    value,
  };
}

/**

- Creates a failed Result containing an error
 */
export function Err<E>(error: E): Err<E> {
  return {
    success: false,
    error,
  };
}

/**

- Type guard to check if a Result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.success === true;
}

/**

- Type guard to check if a Result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.success === false;
}

/**

- Utility functions for working with Result types
 */
export const ResultUtils = {
  /**
  - Maps a function over the Ok value, leaving Err unchanged
   */
  map: <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> => {
    if (isOk(result)) {
      return Ok(fn(result.value));
    }
    return result;
  },

  /**

- Maps a function over the Err value, leaving Ok unchanged
   */
  mapErr: <T, E, F>(
    result: Result<T, E>,
    fn: (error: E) => F
  ): Result<T, F> => {
    if (isErr(result)) {
      return Err(fn(result.error));
    }
    return result;
  },

  /**

- Chains operations that return Results (flatMap/bind)
   */
  andThen: <T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>
  ): Result<U, E> => {
    if (isOk(result)) {
      return fn(result.value);
    }
    return result;
  },

  /**

- Provides a default value if the Result is Err
   */
  unwrapOr: <T, E>(result: Result<T, E>, defaultValue: T): T => {
    if (isOk(result)) {
      return result.value;
    }
    return defaultValue;
  },

  /**

- Provides a default value computed from the error if the Result is Err
   */
  unwrapOrElse: <T, E>(result: Result<T, E>, fn: (error: E) => T): T => {
    if (isOk(result)) {
      return result.value;
    }
    return fn(result.error);
  },

  /**

- Unwraps the Ok value or throws the Err
- Use sparingly - defeats the purpose of Result type
   */
  unwrap: <T, E>(result: Result<T, E>): T => {
    if (isOk(result)) {
      return result.value;
    }
    throw result.error;
  },

  /**

- Unwraps the Ok value or throws with a custom message
   */
  expect: <T, E>(result: Result<T, E>, message: string): T => {
    if (isOk(result)) {
      return result.value;
    }
    throw new Error(`${message}: ${String(result.error)}`);
  },

  /**

- Combines multiple Results into a single Result containing an array
- Fails fast - returns the first error encountered
   */
  all: <T, E>(results: readonly Result<T, E>[]): Result<readonly T[], E> => {
    const values: T[] = [];

    for (const result of results) {
      if (isErr(result)) {
        return result;
      }
      values.push(result.value);
    }

    return Ok(values);
  },

  /**

- Combines multiple Results and collects all errors
- Returns Ok with array of values if all succeed, or Err with array of errors
   */
  allSettled: <T, E>(
    results: readonly Result<T, E>[]
  ): Result<readonly T[], readonly E[]> => {
    const values: T[] = [];
    const errors: E[] = [];

    for (const result of results) {
      if (isOk(result)) {
        values.push(result.value);
      } else {
        errors.push(result.error);
      }
    }

    if (errors.length > 0) {
      return Err(errors);
    }

    return Ok(values);
  },

  /**

- Returns the first Ok result, or the last Err if all fail
   */
  any: <T, E>(results: readonly Result<T, E>[]): Result<T, E> => {
    let lastError: E | undefined;

    for (const result of results) {
      if (isOk(result)) {
        return result;
      }
      lastError = result.error;
    }

    if (lastError !== undefined) {
      return Err(lastError);
    }

    // Empty array case - should not happen in practice
    return Err(new Error('No results provided') as unknown as E);
  },

  /**

- Filters Ok values and collects them into an array
   */
  filterOk: <T, E>(results: readonly Result<T, E>[]): readonly T[] => {
    return results.filter(isOk).map((result) => result.value);
  },

  /**

- Filters Err values and collects them into an array
   */
  filterErr: <T, E>(results: readonly Result<T, E>[]): readonly E[] => {
    return results.filter(isErr).map((result) => result.error);
  },

  /**

- Partitions Results into separate arrays of Ok values and Err values
   */
  partition: <T, E>(
    results: readonly Result<T, E>[]
  ): readonly [readonly T[], readonly E[]] => {
    const okValues: T[] = [];
    const errValues: E[] = [];

    for (const result of results) {
      if (isOk(result)) {
        okValues.push(result.value);
      } else {
        errValues.push(result.error);
      }
    }

    return [okValues, errValues];
  },

  /**

- Converts a throwing function to one that returns a Result
   */
  fromThrowable: <T, E = Error>(
    fn: () => T,
    errorMapper?: (error: unknown) => E
  ): Result<T, E> => {
    try {
      return Ok(fn());
    } catch (error) {
      const mappedError = errorMapper ? errorMapper(error) : (error as E);
      return Err(mappedError);
    }
  },

  /**

- Converts an async throwing function to one that returns a Result
   */
  fromThrowableAsync: async <T, E = Error>(
    fn: () => Promise<T>,
    errorMapper?: (error: unknown) => E
  ): Promise<Result<T, E>> => {
    try {
      const value = await fn();
      return Ok(value);
    } catch (error) {
      const mappedError = errorMapper ? errorMapper(error) : (error as E);
      return Err(mappedError);
    }
  },

  /**

- Converts a Promise to a Result, catching any rejections
   */
  fromPromise: async <T, E = Error>(
    promise: Promise<T>,
    errorMapper?: (error: unknown) => E
  ): Promise<Result<T, E>> => {
    try {
      const value = await promise;
      return Ok(value);
    } catch (error) {
      const mappedError = errorMapper ? errorMapper(error) : (error as E);
      return Err(mappedError);
    }
  },

  /**

- Converts a Result to a Promise, throwing on Err
   */
  toPromise: <T, E>(result: Result<T, E>): Promise<T> => {
    if (isOk(result)) {
      return Promise.resolve(result.value);
    }
    return Promise.reject(result.error);
  },

  /**

- Applies a function to the Result if it's Ok, otherwise returns the Err
- Similar to andThen but for non-Result-returning functions
   */
  match: <T, U, E>(
    result: Result<T, E>,
    onOk: (value: T) => U,
    onErr: (error: E) => U
  ): U => {
    if (isOk(result)) {
      return onOk(result.value);
    }
    return onErr(result.error);
  },

  /**

- Executes side effects based on Result state without changing the Result
   */
  tap: <T, E>(
    result: Result<T, E>,
    onOk?: (value: T) => void,
    onErr?: (error: E) => void
  ): Result<T, E> => {
    if (isOk(result) && onOk) {
      onOk(result.value);
    } else if (isErr(result) && onErr) {
      onErr(result.error);
    }
    return result;
  },
} as const;

/**

- Async Result utilities for Promise-based operations
 */
export const AsyncResultUtils = {
  /**
  - Maps an async function over the Ok value
   */
  mapAsync: async <T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => Promise<U>
  ): Promise<Result<U, E>> => {
    if (isOk(result)) {
      try {
        const newValue = await fn(result.value);
        return Ok(newValue);
      } catch (error) {
        return Err(error as E);
      }
    }
    return result;
  },

  /**

- Chains async operations that return Results
   */
  andThenAsync: async <T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => Promise<Result<U, E>>
  ): Promise<Result<U, E>> => {
    if (isOk(result)) {
      return await fn(result.value);
    }
    return result;
  },

  /**

- Processes an array of values with an async function that returns Results
- Processes sequentially and fails fast
   */
  mapSequential: async <T, U, E>(
    values: readonly T[],
    fn: (value: T) => Promise<Result<U, E>>
  ): Promise<Result<readonly U[], E>> => {
    const results: U[] = [];

    for (const value of values) {
      const result = await fn(value);
      if (isErr(result)) {
        return result;
      }
      results.push(result.value);
    }

    return Ok(results);
  },

  /**

- Processes an array of values with an async function that returns Results
- Processes in parallel and collects all results
   */
  mapParallel: async <T, U, E>(
    values: readonly T[],
    fn: (value: T) => Promise<Result<U, E>>
  ): Promise<Result<readonly U[], readonly E[]>> => {
    const promises = values.map(fn);
    const results = await Promise.all(promises);
    return ResultUtils.allSettled(results);
  },
} as const;

/**

- Helper type for functions that can return either a value or a Result
 */
export type MaybeResult<T, E = Error> = T | Result<T, E>;

/**

- Normalizes a MaybeResult to always be a Result
 */
export function normalizeResult<T, E = Error>(
  value: MaybeResult<T, E>
): Result<T, E> {
  if (typeof value === 'object' && value !== null && 'success' in value) {
    return value as Result<T, E>;
  }
  return Ok(value as T);
}

/**

- Convenience type aliases for common Result patterns
 */
export type StringResult<E = Error> = Result<string, E>;
export type NumberResult<E = Error> = Result<number, E>;
export type BooleanResult<E = Error> = Result<boolean, E>;
export type VoidResult<E = Error> = Result<void, E>;
export type JsonResult<E = Error> = Result<unknown, E>;

/**

- Creates a Result from a value that might be null or undefined
 */
export function fromNullable<T, E>(
  value: T | null | undefined,
  errorFactory: () => E
): Result<T, E> {
  if (value === null || value === undefined) {
    return Err(errorFactory());
  }
  return Ok(value);
}

/**

- Creates a Result from a boolean condition
 */
export function fromBoolean<T, E>(
  condition: boolean,
  value: T,
  errorFactory: () => E
): Result<T, E> {
  if (condition) {
    return Ok(value);
  }
  return Err(errorFactory());
}
