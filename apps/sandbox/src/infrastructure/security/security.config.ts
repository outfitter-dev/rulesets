/**

- @fileoverview Security Configuration Management
-
- Provides comprehensive security configuration with:
- - Centralized security policy management
- - Environment-specific security settings
- - Runtime security parameter validation
- - Security hardening defaults
- - Compliance framework integration
-
- Security Standards:
- - OWASP Top 10 compliance
- - CWE Common Weakness Enumeration
- - NIST Cybersecurity Framework
- - SOC 2 Type II controls
- - GDPR privacy requirements
 */

import { ErrorCodes, SandboxError } from '@/domain/errors';
import { Err, Ok, type Result } from '@/shared/types/result';
import type {
  ErrorExposureLevel,
  ErrorSanitizationConfig,
  SecurityMonitorConfig,
  SecuritySandboxConfig,
} from './index';

/**

- Environment types for security configuration
 */
export type SecurityEnvironment =
  | 'development'
  | 'testing'
  | 'staging'
  | 'production';

/**

- Security compliance frameworks
 */
export type ComplianceFramework =
  | 'owasp'
  | 'nist'
  | 'soc2'
  | 'gdpr'
  | 'pci-dss'
  | 'custom';

/**

- Comprehensive security configuration
 */
export interface SecurityConfig {
  readonly environment: SecurityEnvironment;
  readonly compliance: readonly ComplianceFramework[];
  readonly sandbox: SecuritySandboxConfig;
  readonly monitoring: SecurityMonitorConfig;
  readonly errorHandling: SecurityErrorHandlingConfig;
  readonly validation: SecurityValidationConfig;
  readonly encryption: SecurityEncryptionConfig;
  readonly audit: SecurityAuditConfig;
  readonly network: SecurityNetworkConfig;
  readonly process: SecurityProcessConfig;
}

/**

- Security validation configuration
 */
export interface SecurityValidationConfig {
  readonly strictMode: boolean;
  readonly maxInputSize: number;
  readonly maxOutputSize: number;
  readonly allowedFileExtensions: readonly string[];
  readonly blockedFileExtensions: readonly string[];
  readonly allowedMimeTypes: readonly string[];
  readonly contentScanningEnabled: boolean;
  readonly malwareDetectionEnabled: boolean;
  readonly rateLimiting: {
    readonly enabled: boolean;
    readonly windowMs: number;
    readonly maxRequests: number;
    readonly skipSuccessfulRequests: boolean;
  };
  readonly inputSanitization: {
    readonly enabled: boolean;
    readonly stripHtml: boolean;
    readonly stripScripts: boolean;
    readonly normalizeUnicode: boolean;
    readonly maxDepth: number;
  };
}

/**

- Security error handling configuration
 */
export interface SecurityErrorHandlingConfig {
  readonly defaultExposureLevel: ErrorExposureLevel;
  readonly exposureLevelByEnvironment: Record<
    SecurityEnvironment,
    ErrorExposureLevel

  >;
  readonly sanitization: ErrorSanitizationConfig;
  readonly logging: {
    readonly logAllErrors: boolean;
    readonly logSensitiveErrors: boolean;
    readonly logStackTraces: boolean;
    readonly logUserContext: boolean;
  };
  readonly monitoring: {
    readonly alertOnSensitiveErrors: boolean;
    readonly alertOnHighFrequency: boolean;
    readonly frequencyThreshold: number;
    readonly timeWindowMs: number;
  };
}

/**

- Security encryption configuration
 */
export interface SecurityEncryptionConfig {
  readonly algorithm: string;
  readonly keySize: number;
  readonly encryptionAtRest: boolean;
  readonly encryptionInTransit: boolean;
  readonly keyRotationIntervalMs: number;
  readonly hashAlgorithm: string;
  readonly saltRounds: number;
  readonly secretsEncryption: {
    readonly enabled: boolean;
    readonly algorithm: string;
    readonly keyDerivation: string;
  };
}

/**

- Security audit configuration
 */
export interface SecurityAuditConfig {
  readonly enabled: boolean;
  readonly logAllOperations: boolean;
  readonly logFailedOperations: boolean;
  readonly logPrivilegedOperations: boolean;
  readonly retentionDays: number;
  readonly compressionEnabled: boolean;
  readonly integrityChecking: boolean;
  readonly tamperDetection: boolean;
  readonly complianceReporting: {
    readonly enabled: boolean;
    readonly frameworks: readonly ComplianceFramework[];
    readonly scheduleIntervalMs: number;
  };
}

/**

- Security network configuration
 */
export interface SecurityNetworkConfig {
  readonly allowedHosts: readonly string[];
  readonly blockedHosts: readonly string[];
  readonly allowedPorts: readonly number[];
  readonly tlsVersions: readonly string[];
  readonly certificateValidation: boolean;
  readonly timeout: number;
  readonly rateLimiting: {
    readonly enabled: boolean;
    readonly maxConcurrentConnections: number;
    readonly maxRequestsPerMinute: number;
  };
}

/**

- Security process configuration
 */
export interface SecurityProcessConfig {
  readonly isolationEnabled: boolean;
  readonly memoryLimitBytes: number;
  readonly cpuLimitPercent: number;
  readonly maxExecutionTimeMs: number;
  readonly maxFileDescriptors: number;
  readonly privilegeDropping: {
    readonly enabled: boolean;
    readonly targetUser?: string;
    readonly targetGroup?: string;
  };
  readonly containerSecurity: {
    readonly enabled: boolean;
    readonly readOnlyFilesystem: boolean;
    readonly noNewPrivileges: boolean;
    readonly capabilitiesDrop: readonly string[];
  };
}

/**

- Security policy violation
 */
interface SecurityPolicyViolation {
  readonly policy: string;
  readonly description: string;
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly remediation: string;
}

/**

- Security configuration validation result
 */
interface SecurityConfigValidation {
  readonly valid: boolean;
  readonly violations: readonly SecurityPolicyViolation[];
  readonly warnings: readonly string[];
  readonly complianceScore: number;
}

/**

- Security configuration error
 */
class SecurityConfigError extends SandboxError {
  public readonly violations: readonly SecurityPolicyViolation[];

  constructor(
    message: string,
    violations: readonly SecurityPolicyViolation[] = [],
    context: Record<string, unknown> = {}
  ) {
    super(ErrorCodes.CONFIG_INVALID, message, 'security', 'error', {
      ...context,
      violationCount: violations.length,
    });
    this.violations = violations;
  }
}

/**

- Security configuration manager
 */
export class SecurityConfigManager {
  private currentConfig: SecurityConfig | null = null;
  private readonly complianceValidators = new Map<
    ComplianceFramework,
    (config: SecurityConfig) => SecurityPolicyViolation[]

  >();

  constructor() {
    this.initializeComplianceValidators();
  }

  /**

- Loads and validates security configuration
   */
  async loadConfiguration(
    environment: SecurityEnvironment,
    compliance: readonly ComplianceFramework[] = ['owasp'],
    customConfig?: Partial<SecurityConfig>
  ): Promise<Result<SecurityConfig, SandboxError>> {
    try {
      // Get base configuration for environment
      const baseConfig = this.getBaseConfiguration(environment, compliance);

      // Merge with custom configuration
      const mergedConfig = this.mergeConfigurations(baseConfig, customConfig);

      // Validate configuration
      const validation = await this.validateConfiguration(mergedConfig);
      if (!validation.valid) {
        return Err(
          new SecurityConfigError(
            'Security configuration validation failed',
            validation.violations,
            {
              environment,
              compliance,
              complianceScore: validation.complianceScore,
            }
          )
        );
      }

      // Store configuration
      this.currentConfig = mergedConfig;

      return Ok(mergedConfig);
    } catch (error) {
      return Err(
        new SecurityConfigError(
          `Failed to load security configuration: ${(error as Error).message}`,
          [],
          { environment, compliance }
        )
      );
    }
  }

  /**

- Gets current security configuration
   */
  getCurrentConfiguration(): Result<SecurityConfig, SandboxError> {
    if (!this.currentConfig) {
      return Err(new SecurityConfigError('No security configuration loaded'));
    }

    return Ok({ ...this.currentConfig });
  }

  /**

- Validates a security configuration
   */
  async validateConfiguration(
    config: SecurityConfig
  ): Promise<SecurityConfigValidation> {
    const violations: SecurityPolicyViolation[] = [];
    const warnings: string[] = [];

    // Basic validation
    violations.push(...this.validateBasicSecurity(config));

    // Compliance validation
    for (const framework of config.compliance) {
      const validator = this.complianceValidators.get(framework);
      if (validator) {
        violations.push(...validator(config));
      }
    }

    // Environment-specific validation
    violations.push(...this.validateEnvironmentSecurity(config));

    // Calculate compliance score
    const totalChecks = this.getTotalSecurityChecks(config.compliance);
    const complianceScore = Math.max(
      0,
      ((totalChecks - violations.length) / totalChecks) * 100
    );

    return {
      valid: violations.length === 0,
      violations,
      warnings,
      complianceScore,
    };
  }

  /**

- Gets security configuration for environment
   */
  getConfigurationForEnvironment(
    environment: SecurityEnvironment
  ): SecurityConfig {
    return this.getBaseConfiguration(environment, ['owasp']);
  }

  /**

- Updates configuration at runtime
   */
  async updateConfiguration(
    updates: Partial<SecurityConfig>
  ): Promise<Result<SecurityConfig, SandboxError>> {
    if (!this.currentConfig) {
      return Err(new SecurityConfigError('No configuration loaded to update'));
    }

    const updatedConfig = this.mergeConfigurations(this.currentConfig, updates);
    const validation = await this.validateConfiguration(updatedConfig);

    if (!validation.valid) {
      return Err(
        new SecurityConfigError(
          'Configuration update validation failed',
          validation.violations
        )
      );
    }

    this.currentConfig = updatedConfig;
    return Ok(updatedConfig);
  }

  /**

- Gets base configuration for environment
   */
  private getBaseConfiguration(
    environment: SecurityEnvironment,
    compliance: readonly ComplianceFramework[]
  ): SecurityConfig {
    const isProduction = environment === 'production';
    const isDevelopment = environment === 'development';

    return {
      environment,
      compliance,

      sandbox: {
        allowedPaths: [process.cwd()],
        maxFileSize: isProduction ? 10 * 1024 * 1024 : 50 * 1024 * 1024, // 10MB prod, 50MB dev
        maxFiles: isProduction ? 1000 : 10_000,
        maxDirectories: isProduction ? 100 : 1000,
        maxDepth: 10,
        operationTimeoutMs: isProduction ? 30_000 : 60_000,
        memoryLimitBytes: isProduction ? 512 * 1024 * 1024 : 1024 * 1024 * 1024, // 512MB prod, 1GB dev
        cpuTimeoutMs: isProduction ? 30_000 : 60_000,
        allowSymlinks: false,
        allowHiddenFiles: isDevelopment,
        quarantineEnabled: true,
        auditEnabled: true,
      },

      monitoring: {
        alerting: {
          enabled: true,
          minSeverity: isProduction ? 'medium' : 'high',
          throttleMs: 60_000,
          maxAlertsPerHour: isProduction ? 50 : 100,
        },
        anomalyDetection: {
          enabled: isProduction,
          windowSizeMs: 300_000, // 5 minutes
          thresholdMultiplier: 3,
          minSamples: 10,
          features: [
            'request_rate',
            'error_rate',
            'memory_usage',
            'file_access_patterns',
          ],
        },
        auditLogging: {
          enabled: true,
          rotationSizeBytes: 100 * 1024 * 1024, // 100MB
          maxLogFiles: 10,
          compressionEnabled: isProduction,
        },
        metrics: {
          enabled: true,
          retentionDays: isProduction ? 90 : 7,
          aggregationIntervalMs: 60_000,
        },
        realTimeMonitoring: {
          enabled: true,
          updateIntervalMs: 5000,
          maxEventHistory: isProduction ? 10_000 : 1000,
        },
      },

      errorHandling: {
        defaultExposureLevel: isProduction ? 'minimal' : 'detailed',
        exposureLevelByEnvironment: {
          development: 'internal',
          testing: 'detailed',
          staging: 'minimal',
          production: 'minimal',
        },
        sanitization: {
          exposureLevel: isProduction ? 'minimal' : 'detailed',
          includeStackTrace: !isProduction,
          includeContext: !isProduction,
          includeSuggestions: true,
          maxMessageLength: isProduction ? 500 : 2000,
          scrubPatterns: [], // Populated by SecureErrorHandler
          allowedFields: ['code', 'message', 'timestamp', 'suggestions'],
          sensitiveFields: [
            'stack',
            'context',
            'cause',
            'path',
            'userId',
            'sessionId',
          ],
        },
        logging: {
          logAllErrors: true,
          logSensitiveErrors: true,
          logStackTraces: !isProduction,
          logUserContext: !isProduction,
        },
        monitoring: {
          alertOnSensitiveErrors: true,
          alertOnHighFrequency: true,
          frequencyThreshold: isProduction ? 10 : 50,
          timeWindowMs: 300_000, // 5 minutes
        },
      },

      validation: {
        strictMode: isProduction,
        maxInputSize: 10 * 1024 * 1024, // 10MB
        maxOutputSize: 50 * 1024 * 1024, // 50MB
        allowedFileExtensions: [
          '.md',
          '.txt',
          '.json',
          '.jsonc',
          '.yaml',
          '.yml',
        ],
        blockedFileExtensions: [
          '.exe',
          '.bat',
          '.cmd',
          '.sh',
          '.ps1',
          '.vbs',
          '.js',
          '.php',
          '.py',
        ],
        allowedMimeTypes: [
          'text/plain',
          'text/markdown',
          'application/json',
          'text/yaml',
        ],
        contentScanningEnabled: isProduction,
        malwareDetectionEnabled: isProduction,
        rateLimiting: {
          enabled: true,
          windowMs: 60_000, // 1 minute
          maxRequests: isProduction ? 100 : 1000,
          skipSuccessfulRequests: false,
        },
        inputSanitization: {
          enabled: true,
          stripHtml: true,
          stripScripts: true,
          normalizeUnicode: true,
          maxDepth: 10,
        },
      },

      encryption: {
        algorithm: 'AES-256-GCM',
        keySize: 256,
        encryptionAtRest: isProduction,
        encryptionInTransit: true,
        keyRotationIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
        hashAlgorithm: 'SHA-256',
        saltRounds: 12,
        secretsEncryption: {
          enabled: isProduction,
          algorithm: 'AES-256-GCM',
          keyDerivation: 'PBKDF2',
        },
      },

      audit: {
        enabled: true,
        logAllOperations: isDevelopment,
        logFailedOperations: true,
        logPrivilegedOperations: true,
        retentionDays: isProduction ? 365 : 30,
        compressionEnabled: isProduction,
        integrityChecking: isProduction,
        tamperDetection: isProduction,
        complianceReporting: {
          enabled: isProduction,
          frameworks: compliance,
          scheduleIntervalMs: 24 * 60 * 60 * 1000, // Daily
        },
      },

      network: {
        allowedHosts: ['localhost', '127.0.0.1'],
        blockedHosts: [],
        allowedPorts: [80, 443],
        tlsVersions: ['TLSv1.2', 'TLSv1.3'],
        certificateValidation: isProduction,
        timeout: 30_000,
        rateLimiting: {
          enabled: true,
          maxConcurrentConnections: isProduction ? 100 : 1000,
          maxRequestsPerMinute: isProduction ? 1000 : 10_000,
        },
      },

      process: {
        isolationEnabled: isProduction,
        memoryLimitBytes: 512 * 1024 * 1024, // 512MB
        cpuLimitPercent: 80,
        maxExecutionTimeMs: 300_000, // 5 minutes
        maxFileDescriptors: 1024,
        privilegeDropping: {
          enabled: isProduction,
          targetUser: isProduction ? 'rulesets' : undefined,
          targetGroup: isProduction ? 'rulesets' : undefined,
        },
        containerSecurity: {
          enabled: isProduction,
          readOnlyFilesystem: false, // We need to write compiled files
          noNewPrivileges: true,
          capabilitiesDrop: ['SYS_ADMIN', 'SYS_MODULE', 'SYS_RAWIO'],
        },
      },
    };
  }

  /**

- Merges two configurations
   */
  private mergeConfigurations(
    base: SecurityConfig,
    override?: Partial<SecurityConfig>
  ): SecurityConfig {
    if (!override) return base;

    return {
      ...base,
      ...override,
      sandbox: { ...base.sandbox, ...override.sandbox },
      monitoring: { ...base.monitoring, ...override.monitoring },
      errorHandling: { ...base.errorHandling, ...override.errorHandling },
      validation: { ...base.validation, ...override.validation },
      encryption: { ...base.encryption, ...override.encryption },
      audit: { ...base.audit, ...override.audit },
      network: { ...base.network, ...override.network },
      process: { ...base.process, ...override.process },
    };
  }

  /**

- Validates basic security requirements
   */
  private validateBasicSecurity(
    config: SecurityConfig
  ): SecurityPolicyViolation[] {
    const violations: SecurityPolicyViolation[] = [];

    // Validate sandbox configuration
    if (config.sandbox.allowedPaths.length === 0) {
      violations.push({
        policy: 'sandbox.allowedPaths',
        description: 'At least one allowed path must be configured',
        severity: 'critical',
        remediation: 'Add allowed paths to sandbox configuration',
      });
    }

    if (config.sandbox.maxFileSize <= 0) {
      violations.push({
        policy: 'sandbox.maxFileSize',
        description: 'Maximum file size must be greater than 0',
        severity: 'high',
        remediation: 'Set a positive maximum file size',
      });
    }

    if (config.sandbox.maxFileSize > 100 * 1024 * 1024) {
      // 100MB
      violations.push({
        policy: 'sandbox.maxFileSize',
        description: 'Maximum file size is too large (>100MB)',
        severity: 'medium',
        remediation: 'Reduce maximum file size to prevent resource exhaustion',
      });
    }

    // Validate encryption requirements
    if (
      config.environment === 'production' &&
      !config.encryption.encryptionAtRest
    ) {
      violations.push({
        policy: 'encryption.encryptionAtRest',
        description: 'Encryption at rest must be enabled in production',
        severity: 'critical',
        remediation: 'Enable encryption at rest for production environment',
      });
    }

    if (config.encryption.saltRounds < 10) {
      violations.push({
        policy: 'encryption.saltRounds',
        description: 'Salt rounds must be at least 10 for adequate security',
        severity: 'high',
        remediation: 'Increase salt rounds to at least 10',
      });
    }

    // Validate audit requirements
    if (config.environment === 'production' && !config.audit.enabled) {
      violations.push({
        policy: 'audit.enabled',
        description: 'Audit logging must be enabled in production',
        severity: 'critical',
        remediation: 'Enable audit logging for production environment',
      });
    }

    return violations;
  }

  /**

- Validates environment-specific security requirements
   */
  private validateEnvironmentSecurity(
    config: SecurityConfig
  ): SecurityPolicyViolation[] {
    const violations: SecurityPolicyViolation[] = [];

    switch (config.environment) {
      case 'production':
        // Production-specific validations
        if (
          config.errorHandling.defaultExposureLevel === 'internal' ||
          config.errorHandling.defaultExposureLevel === 'detailed'
        ) {
          violations.push({
            policy: 'errorHandling.exposureLevel',
            description: 'Error exposure level too high for production',
            severity: 'high',
            remediation: 'Use minimal error exposure level in production',
          });
        }

        if (!config.monitoring.anomalyDetection.enabled) {
          violations.push({
            policy: 'monitoring.anomalyDetection',
            description: 'Anomaly detection should be enabled in production',
            severity: 'medium',
            remediation: 'Enable anomaly detection for production monitoring',
          });
        }
        break;

      case 'development':
        // Development-specific validations
        if (config.validation.strictMode) {
          violations.push({
            policy: 'validation.strictMode',
            description: 'Strict mode may hinder development',
            severity: 'low',
            remediation: 'Consider disabling strict mode for development',
          });
        }
        break;
    }

    return violations;
  }

  /**

- Gets total number of security checks for compliance frameworks
   */
  private getTotalSecurityChecks(
    frameworks: readonly ComplianceFramework[]
  ): number {
    const checkCounts: Record<ComplianceFramework, number> = {
      owasp: 20,
      nist: 25,
      soc2: 15,
      gdpr: 10,
      'pci-dss': 30,
      custom: 10,
    };

    return frameworks.reduce(
      (total, framework) => total + (checkCounts[framework] || 10),
      0
    );
  }

  /**

- Initializes compliance validators
   */
  private initializeComplianceValidators(): void {
    // OWASP Top 10 validator
    this.complianceValidators.set('owasp', (config) => {
      const violations: SecurityPolicyViolation[] = [];

      // A01: Broken Access Control
      if (!config.sandbox.auditEnabled) {
        violations.push({
          policy: 'owasp.access-control',
          description: 'Access control auditing must be enabled',
          severity: 'high',
          remediation: 'Enable sandbox audit logging',
        });
      }

      // A02: Cryptographic Failures
      if (config.encryption.algorithm !== 'AES-256-GCM') {
        violations.push({
          policy: 'owasp.cryptography',
          description: 'Use strong encryption algorithms (AES-256-GCM)',
          severity: 'high',
          remediation: 'Update encryption algorithm to AES-256-GCM',
        });
      }

      // A03: Injection
      if (!config.validation.inputSanitization.enabled) {
        violations.push({
          policy: 'owasp.injection',
          description: 'Input sanitization must be enabled',
          severity: 'critical',
          remediation: 'Enable input sanitization to prevent injection attacks',
        });
      }

      // A05: Security Misconfiguration
      if (config.errorHandling.defaultExposureLevel === 'internal') {
        violations.push({
          policy: 'owasp.security-misconfiguration',
          description:
            'Error exposure level too high - information disclosure risk',
          severity: 'medium',
          remediation: 'Use minimal or detailed error exposure level',
        });
      }

      return violations;
    });

    // NIST Cybersecurity Framework validator
    this.complianceValidators.set('nist', (config) => {
      const violations: SecurityPolicyViolation[] = [];

      // Identify: Asset Management
      if (config.sandbox.allowedPaths.length === 0) {
        violations.push({
          policy: 'nist.identify',
          description: 'Asset boundaries must be clearly defined',
          severity: 'high',
          remediation: 'Define allowed paths for sandbox operation',
        });
      }

      // Protect: Access Control
      if (config.sandbox.allowSymlinks) {
        violations.push({
          policy: 'nist.protect',
          description: 'Symlinks increase attack surface',
          severity: 'medium',
          remediation: 'Disable symlink access unless required',
        });
      }

      // Detect: Anomalies and Events
      if (!config.monitoring.anomalyDetection.enabled) {
        violations.push({
          policy: 'nist.detect',
          description: 'Anomaly detection required for threat identification',
          severity: 'medium',
          remediation: 'Enable anomaly detection monitoring',
        });
      }

      // Respond: Response Planning
      if (!config.monitoring.alerting.enabled) {
        violations.push({
          policy: 'nist.respond',
          description: 'Automated response capabilities required',
          severity: 'medium',
          remediation: 'Enable security alerting system',
        });
      }

      // Recover: Recovery Planning
      if (!config.audit.enabled) {
        violations.push({
          policy: 'nist.recover',
          description: 'Audit trails required for incident recovery',
          severity: 'high',
          remediation: 'Enable comprehensive audit logging',
        });
      }

      return violations;
    });

    // Add other compliance validators as needed
    this.complianceValidators.set('soc2', () => []);
    this.complianceValidators.set('gdpr', () => []);
    this.complianceValidators.set('pci-dss', () => []);
    this.complianceValidators.set('custom', () => []);
  }
}

/**

- Default security configurations for different environments
 */
export const DefaultSecurityConfigs = {
  development: (manager: SecurityConfigManager) =>
    manager.getConfigurationForEnvironment('development'),

  testing: (manager: SecurityConfigManager) =>
    manager.getConfigurationForEnvironment('testing'),

  staging: (manager: SecurityConfigManager) =>
    manager.getConfigurationForEnvironment('staging'),

  production: (manager: SecurityConfigManager) =>
    manager.getConfigurationForEnvironment('production'),
} as const;
