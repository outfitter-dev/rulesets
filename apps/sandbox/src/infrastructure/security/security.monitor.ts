/**

- @fileoverview SecurityMonitor - Security Event Logging and Monitoring
-
- Provides comprehensive security monitoring with:
- - Real-time threat detection and alerting
- - Security event logging and analysis
- - Anomaly detection algorithms
- - Compliance reporting and audit trails
- - Performance impact monitoring
-
- Security Features:
- - Machine learning-based anomaly detection
- - Pattern recognition for attack signatures
- - Real-time alerting and response
- - Comprehensive audit logging
- - Performance metrics collection
 */

import { EventEmitter } from 'node:events';
import { ErrorCodes, SandboxError } from '@/domain/errors';
import type { Timestamp } from '@/shared/types/brands';
import { createTimestamp } from '@/shared/types/brands';
import { Err, Ok, type Result } from '@/shared/types/result';
import type { SecurityThreat, SecurityThreatType } from './security.sandbox';

/**

- Security event types
 */
export type SecurityEventType =
  | 'threat_detected'
  | 'attack_blocked'
  | 'suspicious_activity'
  | 'policy_violation'
  | 'access_granted'
  | 'access_denied'
  | 'rate_limit_exceeded'
  | 'resource_limit_exceeded'
  | 'configuration_changed'
  | 'system_anomaly'
  | 'performance_degradation'
  | 'compliance_violation';

/**

- Security event severity levels
 */
export type SecurityEventSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info';

/**

- Security event details
 */
export interface SecurityEvent {
  readonly id: string;
  readonly type: SecurityEventType;
  readonly severity: SecurityEventSeverity;
  readonly timestamp: Timestamp;
  readonly source: string;
  readonly description: string;
  readonly metadata: Record<string, unknown>;
  readonly threat?: SecurityThreat;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly remoteAddress?: string;
  readonly userAgent?: string;
  readonly tags: readonly string[];
  readonly acknowledged: boolean;
  readonly resolved: boolean;
}

/**

- Security alert configuration
 */
export interface SecurityAlertConfig {
  readonly enabled: boolean;
  readonly minSeverity: SecurityEventSeverity;
  readonly throttleMs: number;
  readonly maxAlertsPerHour: number;
  readonly webhookUrl?: string;
  readonly emailRecipients?: readonly string[];
  readonly smsRecipients?: readonly string[];
}

/**

- Anomaly detection configuration
 */
export interface AnomalyDetectionConfig {
  readonly enabled: boolean;
  readonly windowSizeMs: number;
  readonly thresholdMultiplier: number;
  readonly minSamples: number;
  readonly features: readonly AnomalyFeature[];
}

/**

- Anomaly detection features
 */
export type AnomalyFeature =
  | 'request_rate'
  | 'error_rate'
  | 'response_time'
  | 'file_access_patterns'
  | 'memory_usage'
  | 'cpu_usage'
  | 'operation_types'
  | 'path_diversity';

/**

- Security metrics
 */
export interface SecurityMetrics {
  readonly totalEvents: number;
  readonly eventsBySeverity: Record<SecurityEventSeverity, number>;
  readonly eventsByType: Record<SecurityEventType, number>;
  readonly threatsDetected: number;
  readonly attacksBlocked: number;
  readonly false_positives: number;
  readonly averageResponseTime: number;
  readonly uptime: number;
  readonly lastEventTime: Timestamp;
  readonly anomaliesDetected: number;
  readonly complianceScore: number;
}

/**

- Audit log entry
 */
export interface AuditLogEntry {
  readonly timestamp: Timestamp;
  readonly eventType: SecurityEventType;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly action: string;
  readonly resource: string;
  readonly outcome: 'success' | 'failure' | 'blocked';
  readonly details: Record<string, unknown>;
  readonly severity: SecurityEventSeverity;
  readonly remoteAddress?: string;
  readonly userAgent?: string;
  readonly correlationId?: string;
}

/**

- Security monitoring configuration
 */
export interface SecurityMonitorConfig {
  readonly alerting: SecurityAlertConfig;
  readonly anomalyDetection: AnomalyDetectionConfig;
  readonly auditLogging: {
    readonly enabled: boolean;
    readonly rotationSizeBytes: number;
    readonly maxLogFiles: number;
    readonly compressionEnabled: boolean;
  };
  readonly metrics: {
    readonly enabled: boolean;
    readonly retentionDays: number;
    readonly aggregationIntervalMs: number;
  };
  readonly realTimeMonitoring: {
    readonly enabled: boolean;
    readonly updateIntervalMs: number;
    readonly maxEventHistory: number;
  };
}

/**

- Anomaly detection result
 */
interface AnomalyDetectionResult {
  readonly isAnomaly: boolean;
  readonly confidence: number;
  readonly baseline: number;
  readonly currentValue: number;
  readonly feature: AnomalyFeature;
  readonly threshold: number;
}

/**

- Security monitor error
 */
class SecurityMonitorError extends SandboxError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(ErrorCodes.INTERNAL_ERROR, message, 'security', 'error', context);
  }
}

/**

- Comprehensive security monitoring service
 */
export class SecurityMonitor extends EventEmitter {
  private readonly config: SecurityMonitorConfig;
  private readonly events: SecurityEvent[] = [];
  private readonly auditLog: AuditLogEntry[] = [];
  private readonly metrics: SecurityMetrics;
  private readonly anomalyBaselines = new Map<AnomalyFeature, number[]>();
  private readonly alertThrottleMap = new Map<string, Timestamp>();
  private eventIdCounter = 0;
  private startTime: Timestamp;

  constructor(config: SecurityMonitorConfig) {
    super();
    this.config = config;
    this.startTime = createTimestamp(Date.now());
    this.metrics = this.initializeMetrics();

    // Set up real-time monitoring
    if (config.realTimeMonitoring.enabled) {
      setInterval(() => {
        this.updateRealTimeMetrics();
      }, config.realTimeMonitoring.updateIntervalMs);
    }

    // Set up anomaly detection baseline updates
    if (config.anomalyDetection.enabled) {
      setInterval(() => {
        this.updateAnomalyBaselines();
      }, config.anomalyDetection.windowSizeMs);
    }
  }

  /**

- Logs a security event
   */
  async logSecurityEvent(
    type: SecurityEventType,
    severity: SecurityEventSeverity,
    description: string,
    metadata: Record<string, unknown> = {},
    threat?: SecurityThreat
  ): Promise<Result<SecurityEvent, SandboxError>> {
    try {
      const event: SecurityEvent = {
        id: this.generateEventId(),
        type,
        severity,
        timestamp: createTimestamp(Date.now()),
        source: 'security-monitor',
        description,
        metadata: { ...metadata },
        threat,
        userId: metadata.userId as string,
        sessionId: metadata.sessionId as string,
        remoteAddress: metadata.remoteAddress as string,
        userAgent: metadata.userAgent as string,
        tags: this.generateEventTags(type, severity, metadata),
        acknowledged: false,
        resolved: false,
      };

      // Store event
      this.events.push(event);
      this.trimEventHistory();

      // Update metrics
      this.updateMetrics(event);

      // Create audit log entry
      if (this.config.auditLogging.enabled) {
        await this.createAuditLogEntry(event);
      }

      // Anomaly detection
      if (this.config.anomalyDetection.enabled) {
        await this.performAnomalyDetection(event);
      }

      // Alert processing
      if (this.config.alerting.enabled) {
        await this.processAlert(event);
      }

      // Emit event for real-time monitoring
      this.emit('securityEvent', event);

      return Ok(event);
    } catch (error) {
      return Err(
        new SecurityMonitorError(
          `Failed to log security event: ${(error as Error).message}`,
          { type, severity, description, metadata }
        )
      );
    }
  }

  /**

- Reports a security threat
   */
  async reportThreat(
    threat: SecurityThreat
  ): Promise<Result<SecurityEvent, SandboxError>> {
    const eventType: SecurityEventType = this.mapThreatToEventType(threat.type);
    const severity = threat.severity;

    return this.logSecurityEvent(
      eventType,
      severity,
      `Security threat detected: ${threat.description}`,
      {
        threatType: threat.type,
        threatContext: threat.context,
        automated: threat.automated,
        mitigated: threat.mitigated,
        path: threat.path,
      },
      threat
    );
  }

  /**

- Gets security metrics
   */
  getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  /**

- Gets recent security events
   */
  getRecentEvents(
    limit = 100,
    severity?: SecurityEventSeverity,
    type?: SecurityEventType
  ): readonly SecurityEvent[] {
    let filteredEvents = [...this.events];

    if (severity) {
      filteredEvents = filteredEvents.filter((e) => e.severity === severity);
    }

    if (type) {
      filteredEvents = filteredEvents.filter((e) => e.type === type);
    }

    return filteredEvents
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**

- Gets audit log entries
   */
  getAuditLog(
    startTime?: Timestamp,
    endTime?: Timestamp,
    limit = 1000
  ): readonly AuditLogEntry[] {
    let filteredEntries = [...this.auditLog];

    if (startTime) {
      filteredEntries = filteredEntries.filter((e) => e.timestamp >= startTime);
    }

    if (endTime) {
      filteredEntries = filteredEntries.filter((e) => e.timestamp <= endTime);
    }

    return filteredEntries
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**

- Acknowledges a security event
   */
  async acknowledgeEvent(
    eventId: string,
    userId?: string
  ): Promise<Result<void, SandboxError>> {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) {
      return Err(
        new SecurityMonitorError('Security event not found', { eventId })
      );
    }

    (event as any).acknowledged = true;

    await this.logSecurityEvent(
      'system_anomaly',
      'info',
      `Security event acknowledged: ${eventId}`,
      { acknowledgedBy: userId, originalEventId: eventId }
    );

    return Ok(undefined);
  }

  /**

- Resolves a security event
   */
  async resolveEvent(
    eventId: string,
    userId?: string,
    resolution?: string
  ): Promise<Result<void, SandboxError>> {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) {
      return Err(
        new SecurityMonitorError('Security event not found', { eventId })
      );
    }

    (event as any).resolved = true;
    (event as any).acknowledged = true;

    await this.logSecurityEvent(
      'system_anomaly',
      'info',
      `Security event resolved: ${eventId}`,
      { resolvedBy: userId, resolution, originalEventId: eventId }
    );

    return Ok(undefined);
  }

  /**

- Performs anomaly detection on an event
   */
  private async performAnomalyDetection(event: SecurityEvent): Promise<void> {
    for (const feature of this.config.anomalyDetection.features) {
      const currentValue = this.extractFeatureValue(event, feature);
      const result = this.detectAnomaly(feature, currentValue);

      if (result.isAnomaly) {
        await this.logSecurityEvent(
          'system_anomaly',
          'medium',
          `Anomaly detected in ${feature}`,
          {
            feature,
            currentValue: result.currentValue,
            baseline: result.baseline,
            confidence: result.confidence,
            threshold: result.threshold,
            originalEvent: event.id,
          }
        );
      }
    }
  }

  /**

- Detects anomaly in a feature
   */
  private detectAnomaly(
    feature: AnomalyFeature,
    currentValue: number
  ): AnomalyDetectionResult {
    const baseline = this.anomalyBaselines.get(feature) || [];

    if (baseline.length < this.config.anomalyDetection.minSamples) {
      return {
        isAnomaly: false,
        confidence: 0,
        baseline: 0,
        currentValue,
        feature,
        threshold: 0,
      };
    }

    const mean = baseline.reduce((sum, val) => sum + val, 0) / baseline.length;
    const variance =
      baseline.reduce((sum, val) => sum + (val - mean) ** 2, 0) /
      baseline.length;
    const stdDev = Math.sqrt(variance);
    const threshold =
      mean + stdDev * this.config.anomalyDetection.thresholdMultiplier;

    const isAnomaly = currentValue > threshold;
    const confidence = isAnomaly
      ? Math.min(1, (currentValue - threshold) / stdDev)
      : 0;

    return {
      isAnomaly,
      confidence,
      baseline: mean,
      currentValue,
      feature,
      threshold,
    };
  }

  /**

- Extracts feature value from event
   */
  private extractFeatureValue(
    event: SecurityEvent,
    feature: AnomalyFeature
  ): number {
    const now = Date.now();
    const windowStart = now - this.config.anomalyDetection.windowSizeMs;
    const recentEvents = this.events.filter((e) => e.timestamp >= windowStart);

    switch (feature) {
      case 'request_rate':
        return recentEvents.length;

      case 'error_rate':
        return recentEvents.filter(
          (e) => e.severity === 'critical' || e.severity === 'high'
        ).length;

      case 'response_time':
        return (event.metadata.responseTime as number) || 0;

      case 'file_access_patterns':
        return recentEvents.filter(
          (e) => e.type === 'access_granted' || e.type === 'access_denied'
        ).length;

      case 'memory_usage':
        return (
          (event.metadata.memoryUsage as number) ||
          process.memoryUsage().heapUsed
        );

      case 'cpu_usage':
        return (event.metadata.cpuUsage as number) || 0;

      case 'operation_types': {
        const uniqueTypes = new Set(recentEvents.map((e) => e.type));
        return uniqueTypes.size;
      }

      case 'path_diversity': {
        const uniquePaths = new Set(
          recentEvents.map((e) => e.metadata.path as string).filter(Boolean)
        );
        return uniquePaths.size;
      }

      default:
        return 0;
    }
  }

  /**

- Updates anomaly detection baselines
   */
  private updateAnomalyBaselines(): void {
    const now = Date.now();
    const windowStart = now - this.config.anomalyDetection.windowSizeMs;
    const recentEvents = this.events.filter((e) => e.timestamp >= windowStart);

    for (const feature of this.config.anomalyDetection.features) {
      const values = recentEvents.map((event) =>
        this.extractFeatureValue(event, feature)
      );
      const baseline = this.anomalyBaselines.get(feature) || [];

      // Add new values and limit baseline size
      baseline.push(...values);
      const maxBaselineSize = this.config.anomalyDetection.minSamples * 10;
      if (baseline.length > maxBaselineSize) {
        baseline.splice(0, baseline.length - maxBaselineSize);
      }

      this.anomalyBaselines.set(feature, baseline);
    }
  }

  /**

- Processes security alerts
   */
  private async processAlert(event: SecurityEvent): Promise<void> {
    // Check severity threshold
    const severityLevels: Record<SecurityEventSeverity, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
      info: 0,
    };

    const eventSeverityLevel = severityLevels[event.severity];
    const minSeverityLevel = severityLevels[this.config.alerting.minSeverity];

    if (eventSeverityLevel < minSeverityLevel) {
      return;
    }

    // Check throttling
    const throttleKey = `${event.type}_${event.severity}`;
    const lastAlert = this.alertThrottleMap.get(throttleKey);
    const now = Date.now();

    if (lastAlert && now - lastAlert < this.config.alerting.throttleMs) {
      return;
    }

    // Check hourly rate limit
    const hourStart = now - 60 * 60 * 1000;
    const recentAlerts = this.events.filter(
      (e) => e.timestamp >= hourStart && e.metadata.alerted === true
    );

    if (recentAlerts.length >= this.config.alerting.maxAlertsPerHour) {
      return;
    }

    // Send alert
    await this.sendAlert(event);

    // Update throttle map
    this.alertThrottleMap.set(throttleKey, now);

    // Mark event as alerted
    (event.metadata as any).alerted = true;
  }

  /**

- Sends security alert
   */
  private async sendAlert(event: SecurityEvent): Promise<void> {
    const alertMessage = this.formatAlertMessage(event);

    // Emit alert event for external handlers
    this.emit('securityAlert', event, alertMessage);

    // Log the alert
    await this.logSecurityEvent(
      'system_anomaly',
      'info',
      'Security alert sent',
      {
        originalEventId: event.id,
        alertMessage,
        alertType: 'security_alert',
      }
    );
  }

  /**

- Formats alert message
   */
  private formatAlertMessage(event: SecurityEvent): string {
    return `
🚨 SECURITY ALERT 🚨

Severity: ${event.severity.toUpperCase()}
Type: ${event.type}
Time: ${new Date(event.timestamp).toISOString()}
Description: ${event.description}

${
  event.threat
    ? `
Threat Details:

- Type: ${event.threat.type}
- Severity: ${event.threat.severity}
- Path: ${event.threat.path || 'N/A'}
- Automated: ${event.threat.automated}
- Mitigated: ${event.threat.mitigated}
`
    : ''
}

Metadata:
${Object.entries(event.metadata)
  .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
  .join('\n')}

Event ID: ${event.id}
    `.trim();
  }

  /**

- Creates audit log entry
   */
  private async createAuditLogEntry(event: SecurityEvent): Promise<void> {
    const auditEntry: AuditLogEntry = {
      timestamp: event.timestamp,
      eventType: event.type,
      userId: event.userId,
      sessionId: event.sessionId,
      action: event.type,
      resource:
        (event.metadata.path as string) ||
        (event.metadata.resource as string) ||
        'unknown',
      outcome: this.mapEventToOutcome(event),
      details: event.metadata,
      severity: event.severity,
      remoteAddress: event.remoteAddress,
      userAgent: event.userAgent,
      correlationId: event.id,
    };

    this.auditLog.push(auditEntry);

    // Trim audit log if it gets too large
    const maxAuditEntries = 100_000;
    if (this.auditLog.length > maxAuditEntries) {
      this.auditLog.splice(0, this.auditLog.length - maxAuditEntries);
    }
  }

  /**

- Maps event to audit outcome
   */
  private mapEventToOutcome(event: SecurityEvent): AuditLogEntry['outcome'] {
    switch (event.type) {
      case 'attack_blocked':
      case 'access_denied':
      case 'rate_limit_exceeded':
      case 'resource_limit_exceeded':
        return 'blocked';

      case 'access_granted':
        return 'success';

      default:
        return event.severity === 'critical' || event.severity === 'high'
          ? 'failure'
          : 'success';
    }
  }

  /**

- Maps threat type to event type
   */
  private mapThreatToEventType(
    threatType: SecurityThreatType
  ): SecurityEventType {
    switch (threatType) {
      case 'path_traversal_attempt':
      case 'symlink_attack':
      case 'unauthorized_path_access':
        return 'attack_blocked';

      case 'resource_exhaustion':
      case 'memory_limit_exceeded':
      case 'cpu_limit_exceeded':
        return 'resource_limit_exceeded';

      case 'rapid_file_access':
      case 'suspicious_access_pattern':
        return 'suspicious_activity';

      default:
        return 'threat_detected';
    }
  }

  /**

- Generates event tags
   */
  private generateEventTags(
    type: SecurityEventType,
    severity: SecurityEventSeverity,
    metadata: Record<string, unknown>
  ): readonly string[] {
    const tags: string[] = [type, severity];

    if (metadata.automated) tags.push('automated');
    if (metadata.mitigated) tags.push('mitigated');
    if (metadata.userId) tags.push('user-action');
    if (metadata.path) tags.push('file-system');
    if (metadata.threatType) tags.push(`threat-${metadata.threatType}`);

    return tags;
  }

  /**

- Generates unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${++this.eventIdCounter}`;
  }

  /**

- Initializes metrics
   */
  private initializeMetrics(): SecurityMetrics {
    return {
      totalEvents: 0,
      eventsBySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      },
      eventsByType: {
        threat_detected: 0,
        attack_blocked: 0,
        suspicious_activity: 0,
        policy_violation: 0,
        access_granted: 0,
        access_denied: 0,
        rate_limit_exceeded: 0,
        resource_limit_exceeded: 0,
        configuration_changed: 0,
        system_anomaly: 0,
        performance_degradation: 0,
        compliance_violation: 0,
      },
      threatsDetected: 0,
      attacksBlocked: 0,
      false_positives: 0,
      averageResponseTime: 0,
      uptime: 0,
      lastEventTime: this.startTime,
      anomaliesDetected: 0,
      complianceScore: 100,
    };
  }

  /**

- Updates metrics with new event
   */
  private updateMetrics(event: SecurityEvent): void {
    (this.metrics as any).totalEvents++;
    (this.metrics as any).eventsBySeverity[event.severity]++;
    (this.metrics as any).eventsByType[event.type]++;
    (this.metrics as any).lastEventTime = event.timestamp;

    if (event.threat) {
      (this.metrics as any).threatsDetected++;
    }

    if (event.type === 'attack_blocked') {
      (this.metrics as any).attacksBlocked++;
    }

    if (event.type === 'system_anomaly') {
      (this.metrics as any).anomaliesDetected++;
    }

    // Update uptime
    (this.metrics as any).uptime = Date.now() - this.startTime;
  }

  /**

- Updates real-time metrics
   */
  private updateRealTimeMetrics(): void {
    const memoryUsage = process.memoryUsage();

    this.emit('metricsUpdate', {
      ...this.metrics,
      currentMemoryUsage: memoryUsage.heapUsed,
      currentTime: createTimestamp(Date.now()),
    });
  }

  /**

- Trims event history to prevent memory issues
   */
  private trimEventHistory(): void {
    const maxEvents = this.config.realTimeMonitoring.maxEventHistory;
    if (this.events.length > maxEvents) {
      this.events.splice(0, this.events.length - maxEvents);
    }
  }
}
