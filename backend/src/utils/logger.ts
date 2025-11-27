/**
 * Structured Logging Utility for Configuration Management
 *
 * Provides centralized, consistent logging with support for:
 * - ISO 8601 timestamps
 * - Structured JSON format
 * - Multiple log levels (DEBUG, INFO, WARN, ERROR)
 * - Sensitive data sanitization
 * - Context object support
 * - Console and optional file output
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  context?: LogContext;
  action?: string;
  resource?: string;
  resourceId?: string;
}

/**
 * Configuration for logging behavior
 */
export interface LoggingConfig {
  minLevel: LogLevel;
  enableConsoleOutput: boolean;
  enableFileOutput: boolean;
  logFilePath?: string;
  enableColors: boolean;
}

/**
 * Log level priorities for filtering
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * ANSI color codes for console output
 */
const COLORS = {
  DEBUG: '\x1b[36m',    // Cyan
  INFO: '\x1b[32m',     // Green
  WARN: '\x1b[33m',     // Yellow
  ERROR: '\x1b[31m',    // Red
  RESET: '\x1b[0m',     // Reset
};

/**
 * Fields that contain sensitive data and should be masked in logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'community', // SNMP community strings
  'apiToken',
  'secret',
  'key',
  'token',
  'credential',
  'auth',
];

/**
 * Default configuration
 */
const DEFAULT_CONFIG: LoggingConfig = {
  minLevel: 'INFO',
  enableConsoleOutput: true,
  enableFileOutput: false,
  enableColors: true,
};

/**
 * Structured Logger Class
 *
 * Provides centralized logging with structured output and security features
 */
export class Logger {
  private config: LoggingConfig;
  private serviceName: string;

  constructor(serviceName: string = 'estatus-web', config: Partial<LoggingConfig> = {}) {
    this.serviceName = serviceName;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log('DEBUG', message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log('INFO', message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('WARN', message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, context?: LogContext): void {
    this.log('ERROR', message, context);
  }

  /**
   * Log a configuration change with structured context
   */
  logConfigChange(
    action: 'ADDED' | 'UPDATED' | 'DELETED',
    resourceType: 'SERVER' | 'GROUP',
    resourceId: string,
    resourceName?: string,
    changes?: { field: string; from?: any; to?: any }[],
  ): void {
    const message = `Configuration ${action}: ${resourceType} '${resourceName || resourceId}'`;

    const context: LogContext = {
      action,
      resourceType,
      resourceId,
    };

    if (resourceName) {
      context.resourceName = resourceName;
    }

    if (changes && changes.length > 0) {
      context.changes = changes.map(change => ({
        field: change.field,
        from: this.sanitizeValue(change.from),
        to: this.sanitizeValue(change.to),
      }));
    }

    this.log('INFO', message, context);
  }

  /**
   * Log a validation failure with detailed context
   */
  logValidationFailure(
    resourceType: 'SERVER' | 'GROUP',
    operation: 'create' | 'update' | 'delete',
    validationErrors: Record<string, string>,
    requestData?: any,
  ): void {
    const message = `Validation failed for ${resourceType} ${operation}`;

    const context: LogContext = {
      resourceType,
      operation,
      validationErrors,
    };

    if (requestData) {
      context.requestData = this.sanitizeObject(requestData);
    }

    this.log('WARN', message, context);
  }

  /**
   * Log file operations with before/after context
   */
  logFileOperation(
    operation: 'READ' | 'WRITE' | 'DELETE',
    filePath: string,
    context?: { success: boolean; error?: string; beforeState?: any; afterState?: any },
  ): void {
    const message = `File ${operation}: ${filePath}`;

    const logContext: LogContext = {
      fileOperation: operation,
      filePath,
      success: context?.success ?? true,
    };

    if (context?.error) {
      logContext.error = context.error;
    }

    if (context?.beforeState) {
      logContext.beforeState = this.sanitizeObject(context.beforeState);
    }

    if (context?.afterState) {
      logContext.afterState = this.sanitizeObject(context.afterState);
    }

    const level = context?.success === false ? 'ERROR' : 'DEBUG';
    this.log(level, message, logContext);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    // Check if we should log at this level
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
    };

    // Add context if provided (sanitized)
    if (context) {
      logEntry.context = this.sanitizeObject(context);
    }

    // Output to console if enabled
    if (this.config.enableConsoleOutput) {
      this.outputToConsole(logEntry);
    }

    // Output to file if enabled
    if (this.config.enableFileOutput && this.config.logFilePath) {
      this.outputToFile(logEntry);
    }
  }

  /**
   * Output log entry to console with optional colors
   */
  private outputToConsole(logEntry: LogEntry): void {
    const color = this.config.enableColors ? COLORS[logEntry.level] : '';
    const reset = this.config.enableColors ? COLORS.RESET : '';

    // Create formatted message
    let formattedMessage = `${color}[${logEntry.timestamp}] ${logEntry.level}: ${logEntry.message}${reset}`;

    // Add context information
    if (logEntry.context) {
      if (logEntry.context.action && logEntry.context.resourceType) {
        formattedMessage += ` (${logEntry.context.action} ${logEntry.context.resourceType}`;
        if (logEntry.context.resourceId) {
          formattedMessage += ` ${logEntry.context.resourceId}`;
        }
        formattedMessage += ')';
      }

      if (logEntry.context.validationErrors) {
        formattedMessage += ` - Validation errors: ${JSON.stringify(logEntry.context.validationErrors)}`;
      }

      if (logEntry.context.fileOperation) {
        formattedMessage += ` - File: ${logEntry.context.filePath}`;
      }
    }

    // Output based on level
    switch (logEntry.level) {
    case 'DEBUG':
    case 'INFO':
      console.log(formattedMessage);
      break;
    case 'WARN':
      console.warn(formattedMessage);
      break;
    case 'ERROR':
      console.error(formattedMessage);
      break;
    }

    // Output structured context as JSON for debugging
    if (logEntry.context && logEntry.level === 'DEBUG') {
      console.log('Context:', JSON.stringify(logEntry.context, null, 2));
    }
  }

  /**
   * Output log entry to file (JSON lines format)
   */
  private async outputToFile(logEntry: LogEntry): Promise<void> {
    if (!this.config.logFilePath) {
      return;
    }

    try {
      // Import fs here to avoid issues in environments where it's not available
      const { promises: fs } = await import('fs');
      const { join } = await import('path');

      // Ensure directory exists
      const logDir = join(this.config.logFilePath, '..');
      await fs.mkdir(logDir, { recursive: true });

      // Write as JSON line (append)
      const jsonLine = `${JSON.stringify(logEntry)}\n`;
      await fs.appendFile(this.config.logFilePath, jsonLine, 'utf-8');
    } catch (error) {
      // Don't use logger to avoid infinite recursion
      console.error('Failed to write log to file:', error);
    }
  }

  /**
   * Sanitize an object by masking sensitive fields
   */
  private sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (this.isSensitiveField(key)) {
          sanitized[key] = this.maskValue(value);
        } else {
          sanitized[key] = this.sanitizeObject(value);
        }
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Check if a field name indicates sensitive data
   */
  private isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();
    return SENSITIVE_FIELDS.some(sensitive =>
      lowerFieldName.includes(sensitive.toLowerCase()),
    );
  }

  /**
   * Mask a sensitive value
   */
  private maskValue(value: any): string {
    if (value === null || value === undefined) {
      return value;
    }

    const strValue = String(value);

    // If value is short, mask completely
    if (strValue.length <= 4) {
      return '****';
    }

    // Mask most of the value, leaving first and last characters
    const start = strValue.substring(0, 2);
    const end = strValue.substring(strValue.length - 2);
    const middle = '*'.repeat(strValue.length - 4);

    return `${start}${middle}${end}`;
  }

  /**
   * Sanitize a single value (for use in log context)
   */
  private sanitizeValue(value: any): any {
    if (typeof value === 'string' && this.isSensitiveField('value')) {
      return this.maskValue(value);
    }
    return value;
  }
}

/**
 * Default logger instance for general use
 */
export const logger = new Logger('estatus-web');

/**
 * Create a new logger instance with custom configuration
 */
export function createLogger(serviceName: string, config?: Partial<LoggingConfig>): Logger {
  return new Logger(serviceName, config);
}

/**
 * Utility function to compare objects and generate change summary
 */
export function generateChangeSummary(
  before: any,
  after: any,
  resourceName: string,
): string {
  const changes: string[] = [];

  for (const [key, afterValue] of Object.entries(after)) {
    const beforeValue = before?.[key];

    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      if (beforeValue === undefined) {
        changes.push(`Added ${key} = ${JSON.stringify(afterValue)}`);
      } else if (afterValue === undefined) {
        changes.push(`Removed ${key}`);
      } else {
        changes.push(`${key} changed from ${JSON.stringify(beforeValue)} to ${JSON.stringify(afterValue)}`);
      }
    }
  }

  if (changes.length === 0) {
    return `No changes detected for ${resourceName}`;
  }

  return `${resourceName}: ${changes.join(', ')}`;
}