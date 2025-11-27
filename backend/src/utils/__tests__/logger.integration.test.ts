// Integration test for logger functionality
// Tests the complete logging system end-to-end

import { createLogger } from '../logger';

describe('Logger Integration Tests', () => {
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleWarn: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  const logs: Array<{ type: string; message: string }> = [];

  beforeEach(() => {
    // Clear logs
    logs.length = 0;

    // Mock console methods to capture output
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation((message: string, ...args: any[]) => {
      logs.push({ type: 'log', message: String(message) });
    });

    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation((message: string, ...args: any[]) => {
      logs.push({ type: 'warn', message: String(message) });
    });

    mockConsoleError = jest.spyOn(console, 'error').mockImplementation((message: string, ...args: any[]) => {
      logs.push({ type: 'error', message: String(message) });
    });
  });

  afterEach(() => {
    // Restore console methods
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should perform comprehensive logging operations', () => {
    const logger = createLogger('TestLogger', { minLevel: 'DEBUG' });

    // Test basic logging
    logger.info('Test info message');
    logger.warn('Test warning message');
    logger.error('Test error message');

    // Test configuration change logging
    logger.logConfigChange('ADDED', 'SERVER', 'server-001', 'Test Server');

    // Test validation failure logging
    logger.logValidationFailure('SERVER', 'create', {
      name: 'Name is required',
      ip: 'Invalid IP format',
    }, { name: '', ip: 'invalid' });

    // Test file operation logging
    logger.logFileOperation('WRITE', '/path/to/file.json', {
      success: true,
      beforeState: { old: 'data' },
      afterState: { new: 'data' },
    });

    console.log('=== Logger Integration Test Results ===');
    console.log(`Total log entries captured: ${logs.length}`);

    expect(logs.length).toBeGreaterThan(0);

    // Check for expected log types (updated to match actual format)
    const hasInfo = logs.some(log => log.message.includes('INFO:'));
    const hasWarn = logs.some(log => log.message.includes('WARN:'));
    const hasError = logs.some(log => log.message.includes('ERROR:'));
    const hasConfigChange = logs.some(log => log.message.includes('Configuration ADDED'));
    const hasValidationFailure = logs.some(log => log.message.includes('Validation failed'));
    const hasFileOperation = logs.some(log => log.message.includes('File WRITE'));

    console.log(`✅ INFO logs: ${hasInfo ? 'YES' : 'NO'}`);
    console.log(`✅ WARN logs: ${hasWarn ? 'YES' : 'NO'}`);
    console.log(`✅ ERROR logs: ${hasError ? 'YES' : 'NO'}`);
    console.log(`✅ Configuration change logs: ${hasConfigChange ? 'YES' : 'NO'}`);
    console.log(`✅ Validation failure logs: ${hasValidationFailure ? 'YES' : 'NO'}`);
    console.log(`✅ File operation logs: ${hasFileOperation ? 'YES' : 'NO'}`);

    expect(hasInfo).toBe(true);
    expect(hasWarn).toBe(true);
    expect(hasError).toBe(true);
    expect(hasConfigChange).toBe(true);
    expect(hasValidationFailure).toBe(true);
    expect(hasFileOperation).toBe(true);

    console.log('\n🎉 All logger integration tests passed!');
  });

  it('should capture debug context output', () => {
    const logger = createLogger('TestLogger', { minLevel: 'DEBUG' });

    // Test with sensitive data to verify context output
    logger.debug('Test with context', {
      username: 'testuser',
      password: 'secret123',
      apiKey: 'sk-1234567890',
    });

    // Should have main log + context output
    expect(mockConsoleLog).toHaveBeenCalledTimes(2);

    // First call should be the main log message
    expect(mockConsoleLog).toHaveBeenNthCalledWith(1,
      expect.stringContaining('DEBUG: Test with context'),
    );

    // Second call should be the context output
    expect(mockConsoleLog).toHaveBeenNthCalledWith(2,
      'Context:',
      expect.stringContaining('"password": "se*****23"'),
    );
  });
});