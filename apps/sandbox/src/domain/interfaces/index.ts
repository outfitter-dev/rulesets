/**

- @fileoverview Core service interfaces for the Rulesets Sandbox application
-
- Exports all domain service interfaces with proper generic constraints
- and comprehensive type definitions for dependency injection and testing.
 */

import type { SandboxError } from '@/domain/errors';
import type { LogLevel } from '@/shared/types/brands';
import type { SandboxConfig } from '@/shared/types/configuration';
import type { Result } from '@/shared/types/result';

// Re-export primary service interfaces
export *from './compilation-service';
export* from './filesystem-service';

/**

- Structured log entry interface
 */
export interface LogEntry {
  /**Log level*/
  readonly level: LogLevel;

  /** Log message */
  readonly message: string;

  /** Timestamp when log was created */
  readonly timestamp: number;

  /** Component or module that generated the log */
  readonly component?: string;

  /** Request ID for tracing */
  readonly requestId?: string;

  /** Additional structured data */
  readonly data?: Record<string, unknown>;

  /** Error object if applicable */
  readonly error?: Error;

  /** Stack trace if applicable */
  readonly stack?: string;
}

/**

- Structured logging service interface
 */
export interface ILogger {
  /**
  - Logs an error message
   */
  error(message: string, data?: Record<string, unknown>, error?: Error): void;

  /**

- Logs a warning message
   */
  warn(message: string, data?: Record<string, unknown>): void;

  /**

- Logs an info message
   */
  info(message: string, data?: Record<string, unknown>): void;

  /**

- Logs a debug message
   */
  debug(message: string, data?: Record<string, unknown>): void;

  /**

- Logs a trace message
   */
  trace(message: string, data?: Record<string, unknown>): void;

  /**

- Creates a child logger with additional context
   */
  child(context: Record<string, unknown>): ILogger;

  /**

- Sets the log level for this logger
   */
  setLevel(level: LogLevel): void;

  /**

- Gets the current log level
   */
  getLevel(): LogLevel;

  /**

- Flushes any pending log entries
   */
  flush(): Promise<void>;
}

/**

- Configuration service interface for runtime configuration management
 */
export interface IConfigurationService {
  /**
  - Gets the complete configuration object
   */
  getConfig(): Promise<Result<SandboxConfig, SandboxError>>;

  /**

- Gets a specific configuration value by key path
   */
  getValue<T>(
    keyPath: string,
    defaultValue: T
  ): Promise<Result<T, SandboxError>>;

  /**

- Sets a configuration value at runtime
   */
  setValue(
    keyPath: string,
    value: unknown
  ): Promise<Result<void, SandboxError>>;

  /**

- Reloads configuration from source
   */
  reload(): Promise<Result<void, SandboxError>>;

  /**

- Validates the current configuration
   */
  validate(): Promise<Result<readonly string[], SandboxError>>;

  /**

- Watches for configuration changes
   */
  watch(
    callback: (config: SandboxConfig) => void
  ): Promise<Result<void, SandboxError>>;

  /**

- Stops watching for configuration changes
   */
  unwatch(): Promise<Result<void, SandboxError>>;
}

/**

- Service provider information interface (distinct from domain ProviderInfo)
 */
export interface ServiceProviderInfo {
  /**Provider identifier*/
  readonly id: string;

  /** Provider display name */
  readonly name: string;

  /** Provider description */
  readonly description: string;

  /** Provider version */
  readonly version: string;

  /** Whether provider is enabled */
  readonly enabled: boolean;

  /** Provider capabilities */
  readonly capabilities: readonly string[];

  /** Provider metadata */
  readonly metadata: Record<string, unknown>;
}

/**

- Provider registry interface for managing compilation providers
 */
export interface IProviderRegistry {
  /**
  - Registers a new provider
   */
  register(provider: ServiceProviderInfo): Promise<Result<void, SandboxError>>;

  /**

- Unregisters a provider
   */
  unregister(providerId: string): Promise<Result<void, SandboxError>>;

  /**

- Gets information about a specific provider
   */
  getProvider(
    providerId: string
  ): Promise<Result<ServiceProviderInfo, SandboxError>>;

  /**

- Lists all registered providers
   */
  listProviders(
    enabledOnly?: boolean
  ): Promise<Result<readonly ServiceProviderInfo[], SandboxError>>;

  /**

- Checks if a provider is registered and enabled
   */
  isProviderAvailable(
    providerId: string
  ): Promise<Result<boolean, SandboxError>>;

  /**

- Gets providers that support specific capabilities
   */
  getProvidersByCapability(
    capability: string
  ): Promise<Result<readonly ServiceProviderInfo[], SandboxError>>;

  /**

- Validates provider configuration
   */
  validateProvider(
    providerId: string
  ): Promise<Result<readonly string[], SandboxError>>;
}

/**

- Command handler interface for CQRS pattern implementation
 */
export interface ICommandHandler<TRequest, TResponse> {
  /**
  - Handles a command request and returns a response
   */
  handle(request: TRequest): Promise<Result<TResponse, SandboxError>>;

  /**

- Validates that the handler can process the given request
   */
  canHandle(request: unknown): request is TRequest;

  /**

- Gets the command type this handler processes
   */
  getCommandType(): string;
}

/**

- Query handler interface for CQRS pattern implementation
 */
export interface IQueryHandler<TQuery, TResult> {
  /**
  - Handles a query and returns the result
   */
  handle(query: TQuery): Promise<Result<TResult, SandboxError>>;

  /**

- Validates that the handler can process the given query
   */
  canHandle(query: unknown): query is TQuery;

  /**

- Gets the query type this handler processes
   */
  getQueryType(): string;
}

/**

- Event handler interface for event-driven architecture
 */
export interface IEventHandler<TEvent> {
  /**
  - Handles an event
   */
  handle(event: TEvent): Promise<Result<void, SandboxError>>;

  /**

- Validates that the handler can process the given event
   */
  canHandle(event: unknown): event is TEvent;

  /**

- Gets the event type this handler processes
   */
  getEventTypes(): readonly string[];
}

/**

- Message bus interface for decoupled communication
 */
export interface IMessageBus {
  /**
  - Sends a command and waits for response
   */
  send<TRequest, TResponse>(
    command: TRequest
  ): Promise<Result<TResponse, SandboxError>>;

  /**

- Publishes an event to all interested handlers
   */
  publish<TEvent>(event: TEvent): Promise<Result<void, SandboxError>>;

  /**

- Queries data and returns the result
   */
  query<TQuery, TResult>(query: TQuery): Promise<Result<TResult, SandboxError>>;

  /**

- Registers a command handler
   */
  registerCommandHandler<TRequest, TResponse>(
    handler: ICommandHandler<TRequest, TResponse>
  ): Promise<Result<void, SandboxError>>;

  /**

- Registers a query handler
   */
  registerQueryHandler<TQuery, TResult>(
    handler: IQueryHandler<TQuery, TResult>
  ): Promise<Result<void, SandboxError>>;

  /**

- Registers an event handler
   */
  registerEventHandler<TEvent>(
    handler: IEventHandler<TEvent>
  ): Promise<Result<void, SandboxError>>;
}

/**

- Service validation result interface (distinct from domain ValidationResult)
 */
export interface ServiceValidationResult<T> {
  /**Whether validation succeeded*/
  readonly isValid: boolean;

  /** Validated value (if successful) */
  readonly value?: T;

  /** Validation errors */
  readonly errors: readonly ServiceValidationError[];

  /** Validation warnings */
  readonly warnings: readonly ValidationWarning[];
}

/**

- Service validation error interface (distinct from domain ValidationError class)
 */
export interface ServiceValidationError {
  /**Error message*/
  readonly message: string;

  /** Field path where error occurred */
  readonly path: string;

  /** Error code for programmatic handling */
  readonly code: string;

  /** Additional context */
  readonly context?: Record<string, unknown>;
}

/**

- Validation warning interface
 */
export interface ValidationWarning {
  /**Warning message*/
  readonly message: string;

  /** Field path where warning occurred */
  readonly path: string;

  /** Warning code for programmatic handling */
  readonly code: string;

  /** Additional context */
  readonly context?: Record<string, unknown>;
}

/**

- Input validator interface
 */
export interface IValidator<T> {
  /**
  - Validates input and returns detailed results
   */
  validate(
    input: unknown
  ): Promise<Result<ServiceValidationResult<T>, SandboxError>>;

  /**

- Validates input synchronously
   */
  validateSync(input: unknown): ServiceValidationResult<T>;

  /**

- Gets the schema this validator uses
   */
  getSchema(): Record<string, unknown>;
}

/**

- Health check interface for service monitoring
 */
export interface IHealthCheck {
  /**
  - Performs a health check and returns status
   */
  check(): Promise<Result<HealthStatus, SandboxError>>;

  /**

- Gets the name of this health check
   */
  getName(): string;
}

/**

- Health status interface
 */
export interface HealthStatus {
  /**Whether the service is healthy*/
  readonly healthy: boolean;

  /** Status message */
  readonly message: string;

  /** Additional diagnostic data */
  readonly data?: Record<string, unknown>;

  /** Response time in milliseconds */
  readonly responseTimeMs: number;

  /** Timestamp when check was performed */
  readonly timestamp: number;
}

/**

- Service factory interface for dependency injection
 */
export interface IServiceFactory {
  /**
  - Creates a service instance of the specified type
   */
  create<T>(
    serviceType: string,
    config?: Record<string, unknown>
  ): Promise<Result<T, SandboxError>>;

  /**

- Registers a service constructor
   */
  register<T>(
    serviceType: string,
    constructor: (config?: Record<string, unknown>) => Promise<T>
  ): Promise<Result<void, SandboxError>>;

  /**

- Checks if a service type is registered
   */
  isRegistered(serviceType: string): boolean;

  /**

- Lists all registered service types
   */
  listRegistered(): readonly string[];
}

/**

- Application lifecycle interface
 */
export interface IApplicationLifecycle {
  /**
  - Initializes the application
   */
  initialize(): Promise<Result<void, SandboxError>>;

  /**

- Starts the application
   */
  start(): Promise<Result<void, SandboxError>>;

  /**

- Stops the application gracefully
   */
  stop(): Promise<Result<void, SandboxError>>;

  /**

- Gets current application status
   */
  getStatus(): Promise<Result<ApplicationStatus, SandboxError>>;

  /**

- Registers a shutdown hook
   */
  onShutdown(callback: () => Promise<void>): void;
}

/**

- Application status
 */
export type ApplicationStatus =
  | 'initializing'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error';

/**

- Type constraints for service interfaces
 */
export type ServiceInterface =
  | ILogger
  | IConfigurationService
  | IProviderRegistry
  | ICommandHandler<unknown, unknown>
  | IQueryHandler<unknown, unknown>
  | IEventHandler<unknown>
  | IMessageBus
  | IValidator<unknown>
  | IHealthCheck
  | IServiceFactory
  | IApplicationLifecycle;
