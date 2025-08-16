/**

- @fileoverview SecurityValidator - Comprehensive Input Validation and Sanitization
-
- Provides enterprise-grade input validation, sanitization, and security checks
- to prevent injection attacks, malicious input, and security violations.
-
- Security Controls:
- - Advanced path traversal prevention with encoded variant detection
- - Malicious pattern detection and blocking
- - Content size and format validation
- - Command injection prevention
- - Schema-based configuration validation
- - Rate limiting for operations
 */

import { ErrorCodes, SandboxError } from '@/domain/errors';
import type {
  CompiledContent,
  ConfigurationKey,
  SafeDirectoryPath,
  SafeFilePath,
  SourceContent,
} from '@/shared/types/brands';
import { Err, Ok, type Result } from '@/shared/types/result';

/**

- Security validation result with detailed context
 */
export interface SecurityValidationResult {
  readonly valid: boolean;
  readonly violations: readonly SecurityViolation[];
  readonly sanitizedValue?: string;
  readonly riskLevel: SecurityRiskLevel;
  readonly checks: readonly SecurityCheck[];
}

/**

- Security violation details
 */
export interface SecurityViolation {
  readonly type: SecurityViolationType;
  readonly description: string;
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly pattern?: string;
  readonly suggestion: string;
}

/**

- Security check performed
 */
export interface SecurityCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly details?: string;
}

/**

- Security violation types
 */
export type SecurityViolationType =
  | 'path_traversal'
  | 'command_injection'
  | 'script_injection'
  | 'null_byte_injection'
  | 'encoded_attack'
  | 'malicious_pattern'
  | 'size_violation'
  | 'encoding_violation'
  | 'rate_limit_exceeded'
  | 'suspicious_content';

/**

- Security risk levels
 */
export type SecurityRiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

/**

- Rate limiting configuration
 */
interface RateLimitConfig {
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly penaltyMs: number;
}

/**

- Security error for validation failures
 */
class SecurityValidationError extends SandboxError {
  public readonly violations: readonly SecurityViolation[];

  constructor(
    message: string,
    violations: readonly SecurityViolation[],
    context: Record<string, unknown> = {}
  ) {
    super(ErrorCodes.SECURITY_VIOLATION, message, 'security', 'error', {
      ...context,
      violations,
    });
    this.violations = violations;
  }
}

/**

- Comprehensive security validator
 */
export class SecurityValidator {
  private readonly rateLimitMap = new Map<
    string,
    { count: number; resetTime: number; penaltyUntil: number }

  >();
  private readonly maxFileSize = 10 *1024* 1024; // 10MB
  private readonly maxContentSize = 1 *1024* 1024; // 1MB for content validation

  // Security patterns for detection
  private readonly securityPatterns = {
    // Path traversal patterns (including encoded variants)
    pathTraversal: [
      /\.\.[/\\]/g,
      /%2e%2e[/\\%]/gi,
      /\.\.%2f/gi,
      /\.\.%5c/gi,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi,
      /\.\.%252f/gi,
      /\.\.%255c/gi,
      // Unicode variants
      /\u002e\u002e[/\\]/g,
      /\uff0e\uff0e[/\\]/g,
    ],

    // Command injection patterns
    commandInjection: [
      /[;&|`$()]/g,
      /\$\{[^}]*\}/g,
      /\$\([^)]*\)/g,
      /`[^`]*`/g,
      /\|\s*\w+/g,
      /&&\s*\w+/g,
      /;\s*\w+/g,
    ],

    // Script injection patterns
    scriptInjection: [
      /<script[^>]*>/gi,
      /<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /setTimeout\s*\(/gi,
      /setInterval\s*\(/gi,
    ],

    // Null byte injection
    nullByte: [/\x00/g, /%00/gi, /\0/g],

    // Suspicious file extensions
    suspiciousExtensions: [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.com$/i,
      /\.scr$/i,
      /\.pif$/i,
      /\.vbs$/i,
      /\.js$/i,
      /\.jar$/i,
      /\.app$/i,
      /\.dmg$/i,
      /\.pkg$/i,
      /\.deb$/i,
      /\.rpm$/i,
    ],

    // Malicious content patterns
    maliciousContent: [
      /BEGIN\s+PGP\s+PRIVATE\s+KEY/i,
      /-----BEGIN\s+RSA\s+PRIVATE\s+KEY-----/i,
      /ssh-rsa\s+[A-Za-z0-9+/=]+/i,
      /password\s*[:=]\s*[^\s]+/gi,
      /api[_-]?key\s*[:=]\s*[^\s]+/gi,
      /secret\s*[:=]\s*[^\s]+/gi,
      /token\s*[:=]\s*[^\s]+/gi,
      /BEGIN\s+CERTIFICATE/i,
      /BEGIN\s+PRIVATE\s+KEY/i,
    ],
  };

  private readonly rateLimitConfigs: Record<string, RateLimitConfig> = {
    fileOperation: { windowMs: 60_000, maxRequests: 100, penaltyMs: 300_000 }, // 100 ops/min
    configOperation: { windowMs: 60_000, maxRequests: 20, penaltyMs: 600_000 }, // 20 ops/min
    contentValidation: {
      windowMs: 60_000,
      maxRequests: 50,
      penaltyMs: 180_000,
    }, // 50 ops/min
  };

  /**

- Validates a file path with comprehensive security checks
   */
  async validateFilePath(
    path: string,
    operationType = 'fileOperation'
  ): Promise<Result<SecurityValidationResult, SandboxError>> {
    const checks: SecurityCheck[] = [];
    const violations: SecurityViolation[] = [];

    try {
      // Rate limiting check
      const rateLimitResult = this.checkRateLimit(operationType, path);
      if (!rateLimitResult.success) {
        return rateLimitResult;
      }

      // Basic validation
      checks.push({ name: 'basic_validation', passed: true });

      if (!path || typeof path !== 'string') {
        violations.push({
          type: 'malicious_pattern',
          description: 'Path must be a non-empty string',
          severity: 'high',
          suggestion: 'Provide a valid file path string',
        });
      }

      if (path.length > 260) {
        violations.push({
          type: 'size_violation',
          description: 'Path exceeds maximum length (260 characters)',
          severity: 'medium',
          suggestion: 'Use shorter file paths',
        });
      }

      // Path traversal detection (comprehensive)
      const traversalResult = this.detectPathTraversal(path);
      checks.push({
        name: 'path_traversal_detection',
        passed: traversalResult.violations.length === 0,
        details: `Checked ${this.securityPatterns.pathTraversal.length} patterns`,
      });
      violations.push(...traversalResult.violations);

      // Encoded attack detection
      const encodedResult = this.detectEncodedAttacks(path);
      checks.push({
        name: 'encoded_attack_detection',
        passed: encodedResult.violations.length === 0,
      });
      violations.push(...encodedResult.violations);

      // Command injection detection
      const commandResult = this.detectCommandInjection(path);
      checks.push({
        name: 'command_injection_detection',
        passed: commandResult.violations.length === 0,
      });
      violations.push(...commandResult.violations);

      // Null byte detection
      const nullByteResult = this.detectNullBytes(path);
      checks.push({
        name: 'null_byte_detection',
        passed: nullByteResult.violations.length === 0,
      });
      violations.push(...nullByteResult.violations);

      // Suspicious extension check
      const extensionResult = this.checkSuspiciousExtensions(path);
      checks.push({
        name: 'suspicious_extension_check',
        passed: extensionResult.violations.length === 0,
      });
      violations.push(...extensionResult.violations);

      // Control character detection
      const controlCharResult = this.detectControlCharacters(path);
      checks.push({
        name: 'control_character_detection',
        passed: controlCharResult.violations.length === 0,
      });
      violations.push(...controlCharResult.violations);

      // Calculate risk level
      const riskLevel = this.calculateRiskLevel(violations);

      const result: SecurityValidationResult = {
        valid: violations.length === 0,
        violations,
        sanitizedValue: this.sanitizePath(path),
        riskLevel,
        checks,
      };

      return Ok(result);
    } catch (error) {
      return Err(
        new SecurityValidationError(
          `Security validation failed: ${(error as Error).message}`,
          violations,
          { path, operationType }
        )
      );
    }
  }

  /**

- Validates file content for security issues
   */
  async validateFileContent(
    content: string,
    contentType = 'source'
  ): Promise<Result<SecurityValidationResult, SandboxError>> {
    const checks: SecurityCheck[] = [];
    const violations: SecurityViolation[] = [];

    try {
      // Rate limiting
      const rateLimitResult = this.checkRateLimit(
        'contentValidation',
        `content_${contentType}`
      );
      if (!rateLimitResult.success) {
        return rateLimitResult;
      }

      // Size validation
      if (content.length > this.maxContentSize) {
        violations.push({
          type: 'size_violation',
          description: `Content size (${content.length} bytes) exceeds limit (${this.maxContentSize} bytes)`,
          severity: 'high',
          suggestion: 'Reduce content size or split into multiple files',
        });
      }
      checks.push({
        name: 'size_validation',
        passed: content.length <= this.maxContentSize,
        details: `${content.length}/${this.maxContentSize} bytes`,
      });

      // Script injection detection
      const scriptResult = this.detectScriptInjection(content);
      checks.push({
        name: 'script_injection_detection',
        passed: scriptResult.violations.length === 0,
      });
      violations.push(...scriptResult.violations);

      // Command injection detection
      const commandResult = this.detectCommandInjection(content);
      checks.push({
        name: 'command_injection_detection',
        passed: commandResult.violations.length === 0,
      });
      violations.push(...commandResult.violations);

      // Malicious content detection
      const maliciousResult = this.detectMaliciousContent(content);
      checks.push({
        name: 'malicious_content_detection',
        passed: maliciousResult.violations.length === 0,
      });
      violations.push(...maliciousResult.violations);

      // Null byte detection
      const nullByteResult = this.detectNullBytes(content);
      checks.push({
        name: 'null_byte_detection',
        passed: nullByteResult.violations.length === 0,
      });
      violations.push(...nullByteResult.violations);

      // Calculate risk level
      const riskLevel = this.calculateRiskLevel(violations);

      const result: SecurityValidationResult = {
        valid: violations.length === 0,
        violations,
        sanitizedValue: this.sanitizeContent(content),
        riskLevel,
        checks,
      };

      return Ok(result);
    } catch (error) {
      return Err(
        new SecurityValidationError(
          `Content validation failed: ${(error as Error).message}`,
          violations,
          { contentType, contentLength: content.length }
        )
      );
    }
  }

  /**

- Validates configuration values
   */
  async validateConfiguration(
    config: unknown
  ): Promise<Result<SecurityValidationResult, SandboxError>> {
    const checks: SecurityCheck[] = [];
    const violations: SecurityViolation[] = [];

    try {
      // Rate limiting
      const rateLimitResult = this.checkRateLimit(
        'configOperation',
        'config_validation'
      );
      if (!rateLimitResult.success) {
        return rateLimitResult;
      }

      // Basic type check
      if (typeof config !== 'object' || config === null) {
        violations.push({
          type: 'malicious_pattern',
          description: 'Configuration must be a valid object',
          severity: 'high',
          suggestion: 'Provide a valid JSON configuration object',
        });

        return Ok({
          valid: false,
          violations,
          riskLevel: 'high',
          checks: [{ name: 'type_validation', passed: false }],
        });
      }

      checks.push({ name: 'type_validation', passed: true });

      // Deep validation of configuration values
      const deepValidationResult = await this.validateConfigurationDeep(
        config as Record<string, unknown>
      );
      checks.push(...deepValidationResult.checks);
      violations.push(...deepValidationResult.violations);

      const result: SecurityValidationResult = {
        valid: violations.length === 0,
        violations,
        riskLevel: this.calculateRiskLevel(violations),
        checks,
      };

      return Ok(result);
    } catch (error) {
      return Err(
        new SecurityValidationError(
          `Configuration validation failed: ${(error as Error).message}`,
          violations,
          { config: typeof config }
        )
      );
    }
  }

  /**

- Sanitizes a file path
   */
  private sanitizePath(path: string): string {
    return path
      .replace(/[^\w\-._/]/g, '') // Remove dangerous characters
      .replace(/\/+/g, '/') // Normalize slashes
      .replace(/^\/+/, '') // Remove leading slashes
      .replace(/\/+$/, ''); // Remove trailing slashes
  }

  /**

- Sanitizes content
   */
  private sanitizeContent(content: string): string {
    return content
      .replace(/\x00/g, '') // Remove null bytes
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .substring(0, this.maxContentSize); // Truncate if too long
  }

  /**

- Detects path traversal attempts
   */
  private detectPathTraversal(input: string): {
    violations: SecurityViolation[];
  } {
    const violations: SecurityViolation[] = [];

    for (const pattern of this.securityPatterns.pathTraversal) {
      if (pattern.test(input)) {
        violations.push({
          type: 'path_traversal',
          description: 'Path traversal attempt detected',
          severity: 'critical',
          pattern: pattern.source,
          suggestion: 'Use relative paths without parent directory references',
        });
        break; // One violation per type is enough
      }
    }

    return { violations };
  }

  /**

- Detects encoded attacks
   */
  private detectEncodedAttacks(input: string): {
    violations: SecurityViolation[];
  } {
    const violations: SecurityViolation[] = [];

    // Check for URL encoding patterns that could be attacks
    const urlEncodedPattern = /%[0-9a-f]{2}/gi;
    const matches = input.match(urlEncodedPattern);

    if (matches && matches.length > 3) {
      violations.push({
        type: 'encoded_attack',
        description: 'Suspicious URL encoding detected',
        severity: 'high',
        suggestion: 'Avoid using encoded characters in file paths',
      });
    }

    // Check for double encoding
    if (input.includes('%25')) {
      violations.push({
        type: 'encoded_attack',
        description: 'Double encoding detected (possible evasion attempt)',
        severity: 'critical',
        suggestion: 'Use plain text file paths',
      });
    }

    return { violations };
  }

  /**

- Detects command injection patterns
   */
  private detectCommandInjection(input: string): {
    violations: SecurityViolation[];
  } {
    const violations: SecurityViolation[] = [];

    for (const pattern of this.securityPatterns.commandInjection) {
      if (pattern.test(input)) {
        violations.push({
          type: 'command_injection',
          description: 'Command injection pattern detected',
          severity: 'critical',
          pattern: pattern.source,
          suggestion: 'Remove shell metacharacters from input',
        });
        break;
      }
    }

    return { violations };
  }

  /**

- Detects script injection patterns
   */
  private detectScriptInjection(input: string): {
    violations: SecurityViolation[];
  } {
    const violations: SecurityViolation[] = [];

    for (const pattern of this.securityPatterns.scriptInjection) {
      if (pattern.test(input)) {
        violations.push({
          type: 'script_injection',
          description: 'Script injection pattern detected',
          severity: 'high',
          pattern: pattern.source,
          suggestion: 'Remove script tags and JavaScript from content',
        });
        break;
      }
    }

    return { violations };
  }

  /**

- Detects null byte injection
   */
  private detectNullBytes(input: string): { violations: SecurityViolation[] } {
    const violations: SecurityViolation[] = [];

    for (const pattern of this.securityPatterns.nullByte) {
      if (pattern.test(input)) {
        violations.push({
          type: 'null_byte_injection',
          description: 'Null byte injection detected',
          severity: 'critical',
          suggestion: 'Remove null bytes from input',
        });
        break;
      }
    }

    return { violations };
  }

  /**

- Checks for suspicious file extensions
   */
  private checkSuspiciousExtensions(path: string): {
    violations: SecurityViolation[];
  } {
    const violations: SecurityViolation[] = [];

    for (const pattern of this.securityPatterns.suspiciousExtensions) {
      if (pattern.test(path)) {
        violations.push({
          type: 'suspicious_content',
          description: 'Suspicious file extension detected',
          severity: 'medium',
          pattern: pattern.source,
          suggestion: 'Use safe file extensions like .md, .txt, .json',
        });
        break;
      }
    }

    return { violations };
  }

  /**

- Detects malicious content patterns
   */
  private detectMaliciousContent(content: string): {
    violations: SecurityViolation[];
  } {
    const violations: SecurityViolation[] = [];

    for (const pattern of this.securityPatterns.maliciousContent) {
      if (pattern.test(content)) {
        violations.push({
          type: 'malicious_pattern',
          description: 'Potential sensitive data or malicious content detected',
          severity: 'high',
          pattern: pattern.source,
          suggestion:
            'Remove sensitive data like keys, passwords, or certificates',
        });
        break;
      }
    }

    return { violations };
  }

  /**

- Detects control characters
   */
  private detectControlCharacters(input: string): {
    violations: SecurityViolation[];
  } {
    const violations: SecurityViolation[] = [];

    // Control characters (excluding normal whitespace)
    const controlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

    if (controlChars.test(input)) {
      violations.push({
        type: 'encoding_violation',
        description: 'Control characters detected',
        severity: 'medium',
        suggestion: 'Remove control characters from input',
      });
    }

    return { violations };
  }

  /**

- Deep validation of configuration object
   */
  private async validateConfigurationDeep(
    config: Record<string, unknown>,
    path = ''
  ): Promise<{ checks: SecurityCheck[]; violations: SecurityViolation[] }> {
    const checks: SecurityCheck[] = [];
    const violations: SecurityViolation[] = [];

    for (const [key, value] of Object.entries(config)) {
      const currentPath = path ? `${path}.${key}` : key;

      // Validate key
      if (typeof key === 'string') {
        const keyValidation = await this.validateFilePath(
          key,
          'configOperation'
        );
        if (keyValidation.success && !keyValidation.value.valid) {
          violations.push(
            ...keyValidation.value.violations.map((v) => ({
              ...v,
              description: `Configuration key "${currentPath}": ${v.description}`,
            }))
          );
        }
      }

      // Validate value based on type
      if (typeof value === 'string') {
        if (value.length > 1000) {
          violations.push({
            type: 'size_violation',
            description: `Configuration value "${currentPath}" too long`,
            severity: 'medium',
            suggestion: 'Use shorter configuration values',
          });
        }

        // Check for injection patterns in string values
        const contentValidation = await this.validateFileContent(
          value,
          'config'
        );
        if (contentValidation.success && !contentValidation.value.valid) {
          violations.push(
            ...contentValidation.value.violations.map((v) => ({
              ...v,
              description: `Configuration value "${currentPath}": ${v.description}`,
            }))
          );
        }
      } else if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // Recursively validate nested objects
        const nestedResult = await this.validateConfigurationDeep(
          value as Record<string, unknown>,
          currentPath
        );
        checks.push(...nestedResult.checks);
        violations.push(...nestedResult.violations);
      } else if (Array.isArray(value) && value.length > 100) {
        violations.push({
          type: 'size_violation',
          description: `Configuration array "${currentPath}" too large`,
          severity: 'low',
          suggestion: 'Limit array sizes in configuration',
        });
      }
    }

    checks.push({
      name: 'configuration_deep_validation',
      passed: violations.length === 0,
      details: `Validated ${Object.keys(config).length} configuration keys`,
    });

    return { checks, violations };
  }

  /**

- Calculates overall risk level based on violations
   */
  private calculateRiskLevel(
    violations: SecurityViolation[]
  ): SecurityRiskLevel {
    if (violations.length === 0) return 'none';

    const hasCritical = violations.some((v) => v.severity === 'critical');
    const hasHigh = violations.some((v) => v.severity === 'high');
    const hasMedium = violations.some((v) => v.severity === 'medium');

    if (hasCritical) return 'critical';
    if (hasHigh) return 'high';
    if (hasMedium) return 'medium';
    return 'low';
  }

  /**

- Rate limiting check
   */
  private checkRateLimit(
    operationType: string,
    identifier: string
  ): Result<void, SandboxError> {
    const config = this.rateLimitConfigs[operationType];
    if (!config) return Ok(undefined);

    const key = `${operationType}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let entry = this.rateLimitMap.get(key);
    if (!entry) {
      entry = { count: 0, resetTime: now + config.windowMs, penaltyUntil: 0 };
      this.rateLimitMap.set(key, entry);
    }

    // Check if still in penalty period
    if (entry.penaltyUntil > now) {
      return Err(
        new SecurityValidationError(
          'Rate limit penalty in effect',
          [
            {
              type: 'rate_limit_exceeded',
              description: 'Operation blocked due to rate limit violation',
              severity: 'high',
              suggestion: `Wait ${Math.ceil((entry.penaltyUntil - now) / 1000)} seconds before retrying`,
            },
          ],
          { operationType, identifier, penaltyUntil: entry.penaltyUntil }
        )
      );
    }

    // Reset counter if window expired
    if (now >= entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + config.windowMs;
    }

    // Check rate limit
    if (entry.count >= config.maxRequests) {
      entry.penaltyUntil = now + config.penaltyMs;
      return Err(
        new SecurityValidationError(
          'Rate limit exceeded',
          [
            {
              type: 'rate_limit_exceeded',
              description: `Too many ${operationType} operations`,
              severity: 'high',
              suggestion: `Reduce operation frequency. Penalty period: ${config.penaltyMs / 1000} seconds`,
            },
          ],
          { operationType, identifier, maxRequests: config.maxRequests }
        )
      );
    }

    entry.count++;
    return Ok(undefined);
  }

  /**

- Clears rate limiting data (for testing)
   */
  clearRateLimits(): void {
    this.rateLimitMap.clear();
  }

  /**

- Gets current rate limit status
   */
  getRateLimitStatus(
    operationType: string,
    identifier: string
  ): {
    remaining: number;
    resetTime: number;
    penaltyUntil: number;
  } {
    const config = this.rateLimitConfigs[operationType];
    if (!config) {
      return {
        remaining: Number.MAX_SAFE_INTEGER,
        resetTime: 0,
        penaltyUntil: 0,
      };
    }

    const key = `${operationType}:${identifier}`;
    const entry = this.rateLimitMap.get(key);

    if (!entry) {
      return { remaining: config.maxRequests, resetTime: 0, penaltyUntil: 0 };
    }

    return {
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      penaltyUntil: entry.penaltyUntil,
    };
  }
}
