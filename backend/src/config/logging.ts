import { Logger, LoggingConfig } from '../utils/logger';

/**
 * Logging configuration for the estatus-web application
 *
 * This configuration controls logging behavior across all components,
 * including log levels, output destinations, and formatting options.
 */

export const LOGGING_CONFIG: LoggingConfig = {
  // Minimum log level to output
  // DEBUG: Show all logs including detailed debugging information
  // INFO: Show general operational logs (recommended for production)
  // WARN: Show warnings and errors only
  // ERROR: Show errors only
  minLevel: process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG',

  // Enable console output for development and monitoring
  enableConsoleOutput: true,

  // Enable file logging for production environments
  enableFileOutput: process.env.NODE_ENV === 'production',

  // Log file path (only used when enableFileOutput is true)
  logFilePath: process.env.LOG_FILE_PATH || './logs/application.log',

  // Enable colored console output for better readability
  enableColors: process.env.NODE_ENV !== 'production',
};

/**
 * Log levels for different components
 */
export const COMPONENT_LOG_LEVELS = {
  // Configuration management - detailed logging for audit trails
  CONFIG_API: 'INFO',

  // File operations - debug level for detailed file I/O tracking
  FILE_UTILS: 'DEBUG',

  // Configuration manager - info level for hot-reload operations
  CONFIG_MANAGER: 'INFO',

  // Validation - warn level for validation failures
  VALIDATION: 'WARN',

  // SSE events - debug level for real-time event tracking
  SSE_BROADCASTER: 'DEBUG',

  // Ping service - info level for monitoring operations
  PING_SERVICE: 'INFO',
};

/**
 * Log message prefixes for different components
 */
export const LOG_PREFIXES = {
  CONFIG_API: '[Config API]',
  FILE_UTILS: '[File Utils]',
  CONFIG_MANAGER: '[Config Manager]',
  VALIDATION: '[Validation]',
  SSE_BROADCASTER: '[SSE]',
  PING_SERVICE: '[Ping Service]',
};