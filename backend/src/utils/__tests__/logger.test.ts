import { Logger, createLogger } from '../logger';
import { generateChangeSummary } from '../changeDetector';

// Mock console methods to capture output
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    // Mock console methods
    console.log = mockConsole.log;
    console.warn = mockConsole.warn;
    console.error = mockConsole.error;
    console.debug = mockConsole.debug;

    // Clear all mocks
    Object.values(mockConsole).forEach(mock => mock.mockClear());

    // Create fresh logger instance
    logger = new Logger('TestLogger', {
      minLevel: 'DEBUG',
      enableConsoleOutput: true,
      enableFileOutput: false,
      enableColors: false,
    });
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
  });

  describe('Basic Logging', () => {
    it('should log debug messages', () => {
      logger.debug('Test debug message', { key: 'value' });

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG: Test debug message'),
      );
    });

    it('should log info messages', () => {
      logger.info('Test info message', { key: 'value' });

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Test info message'),
      );
    });

    it('should log warning messages', () => {
      logger.warn('Test warning message', { key: 'value' });

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Test warning message'),
      );
    });

    it('should log error messages', () => {
      logger.error('Test error message', { key: 'value' });

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Test error message'),
      );
    });

    it('should respect minimum log level', () => {
      const infoLogger = new Logger('TestLogger', {
        minLevel: 'INFO',
        enableConsoleOutput: true,
        enableFileOutput: false,
        enableColors: false,
      });

      infoLogger.debug('This should not appear');
      infoLogger.info('This should appear');

      expect(mockConsole.log).not.toHaveBeenCalledWith(
        expect.stringContaining('DEBUG:'),
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO: This should appear'),
      );
    });
  });

  describe('Configuration Change Logging', () => {
    it('should log server addition', () => {
      logger.logConfigChange('ADDED', 'SERVER', 'server-001', 'Test Server');

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Configuration ADDED: SERVER \'Test Server\' (ADDED SERVER server-001)'),
      );
    });

    it('should log server update with changes', () => {
      const changes = [
        { field: 'ip', from: '192.168.1.10', to: '192.168.1.20' },
        { field: 'name', from: 'Old Name', to: 'New Name' },
      ];

      logger.logConfigChange('UPDATED', 'SERVER', 'server-001', 'Test Server', changes);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Configuration UPDATED: SERVER \'Test Server\' (UPDATED SERVER server-001)'),
      );
    });

    it('should log group deletion', () => {
      logger.logConfigChange('DELETED', 'GROUP', 'group-1', 'Test Group');

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Configuration DELETED: GROUP \'Test Group\' (DELETED GROUP group-1)'),
      );
    });
  });

  describe('Validation Failure Logging', () => {
    it('should log validation failures with detailed context', () => {
      const validationErrors = {
        name: 'Name is required',
        ip: 'Invalid IP format',
      };

      const requestData = {
        name: '',
        ip: 'invalid-ip',
        community: 'secret-string',
      };

      logger.logValidationFailure('SERVER', 'create', validationErrors, requestData);

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Validation failed for SERVER create'),
      );
    });
  });

  describe('File Operation Logging', () => {
    it('should log successful file operations', () => {
      logger.logFileOperation('WRITE', '/path/to/file.json', {
        success: true,
        beforeState: { old: 'data' },
        afterState: { new: 'data' },
      });

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG: File WRITE: /path/to/file.json'),
      );
    });

    it('should log failed file operations', () => {
      logger.logFileOperation('READ', '/path/to/file.json', {
        success: false,
        error: 'File not found',
      });

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: File READ: /path/to/file.json'),
      );
    });
  });

  describe('Data Sanitization', () => {
    it('should mask sensitive fields in context objects', () => {
      const sensitiveData = {
        name: 'Test Server',
        password: 'secret123',
        community: 'public-string',
        snmpConfig: {
          community: 'secret-community',
          enabled: true,
        },
      };

      logger.debug('Test with sensitive data', sensitiveData);

      // The main log message
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG: Test with sensitive data'),
      );

      // The context should be printed in debug mode with masked sensitive fields
      expect(mockConsole.log).toHaveBeenCalledWith(
        'Context:',
        expect.stringContaining('"password": "se*****23"'),
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        'Context:',
        expect.stringContaining('"community": "pu*********ng"'),
      );
    });

    it('should handle null and undefined values correctly', () => {
      const dataWithNulls = {
        name: 'Test',
        password: null,
        community: undefined,
      };

      logger.debug('Test with nulls', dataWithNulls);

      expect(mockConsole.log).toHaveBeenCalled();
    });
  });
});

describe('Logger Factory', () => {
  it('should create logger with custom service name', () => {
    const customLogger = createLogger('CustomService');

    expect(customLogger).toBeInstanceOf(Logger);
  });

  it('should create logger with custom configuration', () => {
    const customLogger = createLogger('CustomService', {
      minLevel: 'WARN',
      enableColors: false,
    });

    expect(customLogger).toBeInstanceOf(Logger);
  });
});

describe('generateChangeSummary', () => {
  it('should generate summary for server changes', () => {
    const changes = [
      { field: 'ip', from: '192.168.1.10', to: '192.168.1.20' },
      { field: 'name', from: 'Old Name', to: 'New Name' },
    ];

    const summary = generateChangeSummary(changes, 'SERVER');

    expect(summary).toContain('SERVER changes:');
    expect(summary).toContain('ip changed from "192.168.1.10" to "192.168.1.20"');
    expect(summary).toContain('name changed from "Old Name" to "New Name"');
  });

  it('should handle added fields', () => {
    const changes = [
      { field: 'newField', to: 'new value' },
    ];

    const summary = generateChangeSummary(changes, 'SERVER');

    expect(summary).toContain('SERVER changes:');
    expect(summary).toContain('newField set to "new value"');
  });

  it('should handle removed fields', () => {
    const changes = [
      { field: 'removedField', from: 'old value' },
    ];

    const summary = generateChangeSummary(changes, 'SERVER');

    expect(summary).toContain('SERVER changes:');
    expect(summary).toContain('removedField removed (was "old value")');
  });

  it('should handle no changes', () => {
    const summary = generateChangeSummary([], 'SERVER');

    expect(summary).toBe('No changes detected');
  });

  it('should format complex values correctly', () => {
    const changes = [
      { field: 'arrayField', from: ['a', 'b'], to: ['a', 'b', 'c'] },
      { field: 'objectField', from: { key: 'value' }, to: { key: 'newValue', other: 'data' } },
    ];

    const summary = generateChangeSummary(changes, 'SERVER');

    expect(summary).toContain('arrayField changed from [2 items] to [3 items]');
    expect(summary).toContain('objectField changed from {...} to {...}');
  });
});