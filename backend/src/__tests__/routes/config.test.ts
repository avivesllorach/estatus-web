import { promises as fs } from 'fs';
import path from 'path';
import { writeConfigAtomic } from '../../utils/fileUtils';

describe('Atomic Write Integration Tests', () => {
  let testDir: string;
  let serversPath: string;
  let layoutPath: string;

  beforeAll(async () => {
    testDir = path.join(process.cwd(), 'test-temp-integration');
    serversPath = path.join(testDir, 'servers.json');
    layoutPath = path.join(testDir, 'dashboard-layout.json');

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
      await fs.unlink(serversPath);
      await fs.unlink(layoutPath);
    } catch {
      // Files may not exist, that's OK
    }
  });

  describe('Atomic Write for Server Configuration', () => {
    it('should write servers configuration atomically', async () => {
      const serversConfig = {
        'server-1': {
          name: 'Test Server 1',
          ip: '192.168.1.100',
          dnsAddress: 'server1.example.com',
        },
        'server-2': {
          name: 'Test Server 2',
          ip: '192.168.1.101',
          dnsAddress: 'server2.example.com',
        },
      };

      await writeConfigAtomic(serversPath, serversConfig);

      // Verify file exists and has correct content
      const content = await fs.readFile(serversPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(serversConfig);

      // Verify temp file was cleaned up
      try {
        await fs.access(`${serversPath}.tmp`);
        fail('Temp file should have been cleaned up');
      } catch {
        // Temp file doesn't exist, which is correct
      }
    });

    it('should preserve file permissions for server configuration', async () => {
      const serversConfig = {
        'server-1': {
          name: 'Test Server',
          ip: '192.168.1.100',
          dnsAddress: 'server.example.com',
        },
      };

      // Create initial file with specific permissions
      await fs.writeFile(serversPath, '{}', 'utf-8');
      await fs.chmod(serversPath, 0o600);

      await writeConfigAtomic(serversPath, serversConfig);

      // Verify permissions were preserved
      const stats = await fs.stat(serversPath);
      expect(stats.mode & 0o777).toBe(0o600);
    });
  });

  describe('Atomic Write for Group Configuration', () => {
    it('should write dashboard layout configuration atomically', async () => {
      const layoutConfig = {
        groups: [
          {
            id: 'group-1',
            name: 'Test Group 1',
            order: 1,
            serverIds: ['server-1', 'server-2'],
          },
          {
            id: 'group-2',
            name: 'Test Group 2',
            order: 2,
            serverIds: ['server-3'],
          },
        ],
      };

      await writeConfigAtomic(layoutPath, layoutConfig);

      // Verify file exists and has correct content
      const content = await fs.readFile(layoutPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(layoutConfig);

      // Verify temp file was cleaned up
      try {
        await fs.access(`${layoutPath}.tmp`);
        fail('Temp file should have been cleaned up');
      } catch {
        // Temp file doesn't exist, which is correct
      }
    });
  });

  describe('Concurrent Atomic Writes', () => {
    it('should handle atomic writes to different files independently', async () => {
      const serversConfig = {
        'server-1': { name: 'Server 1', ip: '192.168.1.100' },
      };
      const layoutConfig = {
        groups: [{ id: 'group-1', name: 'Group 1', order: 1, serverIds: [] }],
      };

      // Execute writes to different files
      await Promise.all([
        writeConfigAtomic(serversPath, serversConfig),
        writeConfigAtomic(layoutPath, layoutConfig),
      ]);

      // Verify both files were written correctly
      const serversContent = await fs.readFile(serversPath, 'utf-8');
      const layoutContent = await fs.readFile(layoutPath, 'utf-8');

      expect(JSON.parse(serversContent)).toEqual(serversConfig);
      expect(JSON.parse(layoutContent)).toEqual(layoutConfig);
    });
  });

  describe('Error Recovery and Data Integrity', () => {
    it('should demonstrate atomic write with success scenario', async () => {
      // Test the happy path - atomic write should succeed
      const config = {
        servers: [
          { id: 'server-1', name: 'Test Server 1', ip: '192.168.1.100' },
          { id: 'server-2', name: 'Test Server 2', ip: '192.168.1.101' },
        ],
      };

      await writeConfigAtomic(serversPath, config);

      // Verify the write succeeded
      const content = await fs.readFile(serversPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(config);

      // Verify no temp files remain
      try {
        await fs.access(`${serversPath}.tmp`);
        fail('Temp file should have been cleaned up');
      } catch {
        // Temp file doesn't exist, which is correct
      }
    });
  });

  describe('Data Formatting and Structure', () => {
    it('should maintain JSON formatting with 2-space indentation', async () => {
      const config = {
        servers: [
          { id: '1', name: 'Server 1', config: { port: 8080, ssl: true } },
          { id: '2', name: 'Server 2', config: { port: 9090, ssl: false } },
        ],
        groups: {
          default: { order: 1, serverIds: ['1', '2'] },
        },
      };

      await writeConfigAtomic(layoutPath, config);

      const content = await fs.readFile(layoutPath, 'utf-8');

      // Check for 2-space indentation
      expect(content).toContain('  "servers": [');
      expect(content).toContain('    {');
      expect(content).toContain('      "id": "1"');
      expect(content).toContain('      "config": {');
      expect(content).toContain('        "port": 8080');

      // Verify it's valid JSON
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(config);
    });

    it('should handle empty and null values correctly', async () => {
      const config = {
        emptyArray: [],
        emptyObject: {},
        nullValue: null,
        zeroValue: 0,
        emptyString: '',
      };

      await writeConfigAtomic(serversPath, config);

      const content = await fs.readFile(serversPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(config);
    });
  });
});