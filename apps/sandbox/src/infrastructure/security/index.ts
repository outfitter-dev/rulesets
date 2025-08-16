/**

- @fileoverview Security Infrastructure Module
-
- Comprehensive security system providing:
- - Input validation and sanitization
- - Advanced sandboxing and path validation
- - Security monitoring and threat detection
- - Secure error handling and information disclosure prevention
- - Security configuration management
- - Compliance framework integration
-
- This module implements enterprise-grade security controls following
- OWASP Top 10, NIST Cybersecurity Framework, and SOC 2 Type II standards.
 */

export type {
  ProcessExecutionContext,
  ProcessExecutionResult,
  ProcessResourceUsage,
  ProcessSecurityViolation,
  ProcessViolationType,
} from './process.security';
export {
  ProcessSecurityFactory,
  ProcessSecurityService,
} from './process.security';
export type {
  ErrorExposureLevel,
  ErrorHandlingContext,
  ErrorSanitizationConfig,
  ErrorStatistics,
  InternalErrorContext,
  PublicError,
} from './secure.error-handler';
export { SecureErrorHandler } from './secure.error-handler';
// Types and interfaces
export type {
  AnomalyDetectionConfig,
  AnomalyFeature,
  AuditLogEntry,
  ComplianceFramework,
  ComplianceFramework,
  // Error handler types
  ErrorExposureLevel,
  ErrorHandlingContext,
  ErrorSanitizationConfig,
  ErrorStatistics,
  InternalErrorContext,
  PathValidationResult,
  PublicError,
  ResourceUsage,
  SandboxOperationResult,
  SecurityAlertConfig,
  SecurityAuditConfig,
  SecurityAuditConfig,
  SecurityCheck,
  // Configuration types
  SecurityConfig,
  SecurityConfig,
  SecurityEncryptionConfig,
  SecurityEncryptionConfig,
  SecurityEnvironment,
  SecurityEnvironment,
  SecurityErrorHandlingConfig,
  SecurityErrorHandlingConfig,
  SecurityEvent,
  SecurityEventSeverity,
  SecurityEventType,
  SecurityMetrics,
  // Monitor types
  SecurityMonitorConfig,
  SecurityNetworkConfig,
  SecurityNetworkConfig,
  SecurityProcessConfig,
  SecurityProcessConfig,
  SecurityRiskLevel,
  // Sandbox types
  SecuritySandboxConfig,
  SecurityThreat,
  SecurityThreatType,
  SecurityValidationConfig,
  SecurityValidationConfig,
  // Validator types
  SecurityValidationResult,
  SecurityViolation,
  SecurityViolationType,
} from './security.config';
export {
  DefaultSecurityConfigs,
  SecurityConfigManager,
} from './security.config';
export type {
  AnomalyDetectionConfig,
  AnomalyFeature,
  AuditLogEntry,
  SecurityAlertConfig,
  SecurityEvent,
  SecurityEventSeverity,
  SecurityEventType,
  SecurityMetrics,
  SecurityMonitorConfig,
} from './security.monitor';
export { SecurityMonitor } from './security.monitor';
export type {
  PathValidationResult,
  ResourceUsage,
  SandboxOperationResult,
  SecuritySandboxConfig,
  SecurityThreat,
  SecurityThreatType,
} from './security.sandbox';
export { SecuritySandbox } from './security.sandbox';
// Core security services
export { SecurityValidator } from './security.validator';

/**

- Security service factory for creating configured security instances
 */
export class SecurityServiceFactory {
  private static instance: SecurityServiceFactory | null = null;

  private constructor() {}

  /**

- Gets singleton instance
   */
  static getInstance(): SecurityServiceFactory {
    if (!SecurityServiceFactory.instance) {
      SecurityServiceFactory.instance = new SecurityServiceFactory();
    }
    return SecurityServiceFactory.instance;
  }

  /**

- Creates a complete security system with all services
   */
  async createSecuritySystem(config: SecurityConfig): Promise<{
    validator: SecurityValidator;
    sandbox: SecuritySandbox;
    monitor: SecurityMonitor;
    errorHandler: SecureErrorHandler;
    configManager: SecurityConfigManager;
    processSecurityService: ProcessSecurityService;
  }> {
    // Initialize services
    const monitor = new SecurityMonitor(config.monitoring);
    const errorHandler = new SecureErrorHandler(monitor);
    const validator = new SecurityValidator();
    const sandbox = new SecuritySandbox(config.sandbox);
    const configManager = new SecurityConfigManager();
    const processSecurityService = new ProcessSecurityService(
      config.process,
      monitor,
      errorHandler
    );

    // Load configuration into manager
    await configManager.loadConfiguration(
      config.environment,
      config.compliance,
      config
    );

    return {
      validator,
      sandbox,
      monitor,
      errorHandler,
      configManager,
      processSecurityService,
    };
  }

  /**

- Creates security services for specific environment
   */
  async createForEnvironment(
    environment: SecurityEnvironment,
    compliance: readonly ComplianceFramework[] = ['owasp']
  ): Promise<{
    validator: SecurityValidator;
    sandbox: SecuritySandbox;
    monitor: SecurityMonitor;
    errorHandler: SecureErrorHandler;
    configManager: SecurityConfigManager;
    processSecurityService: ProcessSecurityService;
    config: SecurityConfig;
  }> {
    const configManager = new SecurityConfigManager();
    const configResult = await configManager.loadConfiguration(
      environment,
      compliance
    );

    if (!configResult.success) {
      throw new Error(
        `Failed to create security system: ${configResult.error.message}`
      );
    }

    const config = configResult.value;
    const services = await this.createSecuritySystem(config);

    return {
      ...services,
      config,
    };
  }
}

/**

- Convenience function to create security system for development
 */
export async function createDevelopmentSecurity() {
  const factory = SecurityServiceFactory.getInstance();
  return factory.createForEnvironment('development', ['owasp']);
}

/**

- Convenience function to create security system for production
 */
export async function createProductionSecurity() {
  const factory = SecurityServiceFactory.getInstance();
  return factory.createForEnvironment('production', ['owasp', 'nist', 'soc2']);
}

/**

- Security system integration utilities
 */
export class SecurityIntegration {
  /**
  - Integrates security services with existing file system service
   */
  static async integrateWithFileSystem(
    fileSystem: any, // TODO: Type this properly
    securityServices: {
      validator: SecurityValidator;
      sandbox: SecuritySandbox;
      monitor: SecurityMonitor;
      errorHandler: SecureErrorHandler;
    }
  ): Promise<any> {
    // This would wrap the file system service with security checks
    // Implementation would depend on the actual file system interface
    return fileSystem;
  }

  /**

- Integrates security monitoring with CLI commands
   */
  static integrateWithCLI(
    cli: any, // TODO: Type this properly
    securityServices: {
      validator: SecurityValidator;
      monitor: SecurityMonitor;
      errorHandler: SecureErrorHandler;
    }
  ): void {
    // This would add security middleware to CLI commands
    // Implementation would depend on the CLI framework used
  }
}

/**

- Security health checker
 */
export class SecurityHealthChecker {
  constructor(
    private readonly services: {
      validator: SecurityValidator;
      sandbox: SecuritySandbox;
      monitor: SecurityMonitor;
      errorHandler: SecureErrorHandler;
      configManager: SecurityConfigManager;
      processSecurityService: ProcessSecurityService;
    }
  ) {}

  /**

- Performs comprehensive security health check
   */
  async performHealthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    metrics: {
      validator: any;
      sandbox: ResourceUsage;
      monitor: SecurityMetrics;
      errorHandler: ErrorStatistics;
    };
  }> {
    const issues: string[] = [];

    try {
      // Check configuration
      const configResult =
        this.services.configManager.getCurrentConfiguration();
      if (!configResult.success) {
        issues.push('Security configuration not loaded');
      }

      // Get metrics from all services
      const sandboxUsage = this.services.sandbox.getResourceUsage();
      const monitorMetrics = this.services.monitor.getMetrics();
      const errorStats = this.services.errorHandler.getStatistics();
      const processUsage =
        this.services.processSecurityService.getGlobalResourceUsage();

      // Check for concerning metrics
      if (sandboxUsage.memoryUsageBytes > 1024 * 1024 * 1024) {
        // 1GB
        issues.push('High memory usage detected');
      }

      if (monitorMetrics.threatsDetected > 10) {
        issues.push('High number of security threats detected');
      }

      if (errorStats.sensitiveErrorsBlocked > 5) {
        issues.push('Multiple sensitive errors detected');
      }

      if (processUsage.violations.length > 5) {
        issues.push('Multiple process security violations detected');
      }

      if (processUsage.processes > 50) {
        issues.push('High number of active processes');
      }

      return {
        healthy: issues.length === 0,
        issues,
        metrics: {
          validator: {}, // SecurityValidator doesn't expose metrics yet
          sandbox: sandboxUsage,
          monitor: monitorMetrics,
          errorHandler: errorStats,
          processSecurityService: processUsage,
        },
      };
    } catch (error) {
      issues.push(`Health check failed: ${(error as Error).message}`);

      return {
        healthy: false,
        issues,
        metrics: {
          validator: {},
          sandbox: this.services.sandbox.getResourceUsage(),
          monitor: this.services.monitor.getMetrics(),
          errorHandler: this.services.errorHandler.getStatistics(),
          processSecurityService:
            this.services.processSecurityService.getGlobalResourceUsage(),
        },
      };
    }
  }
}

/**

- Security constants and defaults
 */
export const SecurityConstants = {
  DEFAULT_MAX_FILE_SIZE: 10* 1024 *1024, // 10MB
  DEFAULT_MAX_FILES: 1000,
  DEFAULT_MAX_DIRECTORIES: 100,
  DEFAULT_OPERATION_TIMEOUT: 30_000, // 30 seconds
  DEFAULT_MEMORY_LIMIT: 512* 1024 * 1024, // 512MB

  SUPPORTED_COMPLIANCE_FRAMEWORKS: [
    'owasp',
    'nist',
    'soc2',
    'gdpr',
    'pci-dss',
  ] as const,
  SUPPORTED_ENVIRONMENTS: [
    'development',
    'testing',
    'staging',
    'production',
  ] as const,

  SECURITY_EVENT_RETENTION_DAYS: {
    development: 7,
    testing: 14,
    staging: 30,
    production: 365,
  },

  ERROR_EXPOSURE_LEVELS: ['none', 'minimal', 'detailed', 'internal'] as const,
} as const;
