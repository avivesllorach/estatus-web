import { promises as fs, constants } from 'fs';
import path from 'path';
import { writeConfigAtomic, readConfigFile } from '../../utils/fileUtils';

describe('writeConfigAtomic', () => {
  let testDir: string;
  let testFilePath: string;

  beforeAll(async () => {
    testDir = path.join(process.cwd(), 'test-temp');
    testFilePath = path.join(testDir, 'test-config.json');

    // Ensure test directory exists
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up test directory:', error);
    }
  });

  beforeEach(async () => {
    // Clean up any files from previous tests
    try {
      await fs.unlink(testFilePath);
      await fs.unlink(`${testFilePath}.tmp`);
    } catch {
      // Files may not exist, that's OK
    }
  });

  describe('Basic Atomic Write Pattern', () => {
    it('should write to temporary file then rename atomically', async () => {
      const testData = { test: 'data', number: 42 };

      await writeConfigAtomic(testFilePath, testData);

      // Verify final file exists and contains correct data
      const finalContent = await fs.readFile(testFilePath, 'utf-8');
      const parsedData = JSON.parse(finalContent);
      expect(parsedData).toEqual(testData);

      // Verify temp file was cleaned up
      try {
        await fs.access(`${testFilePath}.tmp`);
        fail('Temp file should have been cleaned up');
      } catch {
        // Temp file doesn't exist, which is correct
      }
    });

    it('should use .tmp extension for temporary file', async () => {
      const testData = { test: 'temp-file-extension' };

      await writeConfigAtomic(testFilePath, testData);

      // Verify final file exists
      const finalContent = await fs.readFile(testFilePath, 'utf-8');
      expect(finalContent).toContain('"test": "temp-file-extension"');

      // Verify temp file was cleaned up
      try {
        await fs.access(`${testFilePath}.tmp`);
        fail('Temp file should have been cleaned up');
      } catch {
        // Temp file doesn't exist, which is correct
      }
    });
  });

  describe('Write Verification', () => {
    it('should verify temporary file was written successfully', async () => {
      const testData = { test: 'verification' };

      await writeConfigAtomic(testFilePath, testData);

      // Verify file has content (write succeeded)
      const stats = await fs.stat(testFilePath);
      expect(stats.size).toBeGreaterThan(0);

      const content = await fs.readFile(testFilePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(testData);
    });
  });

  describe('File Permission Preservation', () => {
    it('should preserve original file permissions', async () => {
      const testData = { test: 'permissions' };
      const originalPermissions = 0o600;

      // Create original file with specific permissions
      await fs.writeFile(testFilePath, JSON.stringify({ old: 'data' }), 'utf-8');
      await fs.chmod(testFilePath, originalPermissions);

      await writeConfigAtomic(testFilePath, testData);

      // Verify permissions were preserved
      const stats = await fs.stat(testFilePath);
      expect(stats.mode & 0o777).toBe(originalPermissions);
    });

    it('should use default permissions for new files', async () => {
      const testData = { test: 'new file' };

      await writeConfigAtomic(testFilePath, testData);

      // File should be created with default permissions
      const stats = await fs.stat(testFilePath);
      expect(stats.isFile()).toBe(true);

      // Should be readable and writable by owner
      const permissions = stats.mode & 0o777;
      expect(permissions & 0o600).toBe(0o600);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should complete atomic write successfully and clean up temp files', async () => {
      const testData = { atomic: 'write test' };

      await writeConfigAtomic(testFilePath, testData);

      // Verify write succeeded
      const content = await fs.readFile(testFilePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(testData);

      // Verify temp files were cleaned up
      try {
        await fs.access(`${testFilePath}.tmp`);
        fail('Temp file should have been cleaned up');
      } catch {
        // Temp file doesn't exist, which is correct
      }
    });
  });

  describe('Data Integrity', () => {
    it('should maintain JSON formatting with 2-space indentation', async () => {
      const testData = { formatted: 'data', nested: { deeply: { structure: true } } };

      await writeConfigAtomic(testFilePath, testData);

      const content = await fs.readFile(testFilePath, 'utf-8');

      // Check for 2-space indentation
      expect(content).toContain('  "formatted": "data"');
      expect(content).toContain('    "deeply":');
      expect(content).toContain('      "structure": true');

      // Verify it's valid JSON
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(testData);
    });

    it('should handle complex nested objects', async () => {
      const complexData = {
        servers: [
          { id: '1', name: 'Server 1', config: { port: 8080, ssl: true } },
          { id: '2', name: 'Server 2', config: { port: 9090, ssl: false } }
        ],
        groups: {
          default: { order: 1, serverIds: ['1', '2'] }
        }
      };

      await writeConfigAtomic(testFilePath, complexData);

      const readData = await readConfigFile(testFilePath);
      expect(readData).toEqual(complexData);
    });

    it('should handle empty and null values correctly', async () => {
      const config = {
        emptyArray: [],
        emptyObject: {},
        nullValue: null,
        zeroValue: 0,
        emptyString: '',
        nested: {
          nullNested: null,
          arrayEmpty: []
        }
      };

      await writeConfigAtomic(testFilePath, config);

      const content = await fs.readFile(testFilePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(config);
    });
  });
});

describe('readConfigFile', () => {
  let testDir: string;
  let testFilePath: string;

  beforeAll(async () => {
    testDir = path.join(process.cwd(), 'test-temp-read');
    testFilePath = path.join(testDir, 'test-read-config.json');
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up test directory:', error);
    }
  });

  it('should read and parse JSON configuration file', async () => {
    const testData = { read: 'test', number: 123 };
    await fs.writeFile(testFilePath, JSON.stringify(testData), 'utf-8');

    const result = await readConfigFile(testFilePath);
    expect(result).toEqual(testData);
  });

  it('should throw error for non-existent file', async () => {
    const nonExistentPath = path.join(testDir, 'non-existent.json');

    await expect(readConfigFile(nonExistentPath)).rejects.toThrow('Failed to read configuration file');
  });

  it('should throw error for invalid JSON', async () => {
    await fs.writeFile(testFilePath, 'invalid json content', 'utf-8');

    await expect(readConfigFile(testFilePath)).rejects.toThrow('Failed to read configuration file');
  });

  it('should preserve data types correctly', async () => {
    const typedData = {
      string: 'hello',
      number: 42,
      boolean: true,
      nullValue: null,
      array: [1, 2, 3],
      object: { nested: 'value' }
    };

    await fs.writeFile(testFilePath, JSON.stringify(typedData), 'utf-8');

    const result = await readConfigFile(testFilePath) as typeof typedData;
    expect(result).toEqual(typedData);
    expect(typeof result.string).toBe('string');
    expect(typeof result.number).toBe('number');
    expect(typeof result.boolean).toBe('boolean');
    expect(result.nullValue).toBeNull();
    expect(Array.isArray(result.array)).toBe(true);
    expect(typeof result.object).toBe('object');
  });
});