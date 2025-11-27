/**
 * SNMP Configuration Workflow Integration Tests
 *
 * Tests for the fix in Story 4.8: Fix SNMP Configuration Validation for Existing Servers
 * Tests the complete SNMP configuration validation workflow and state transitions
 */

import { validateServerConfig } from '../../utils/validation';
import fs from 'fs/promises';
import path from 'path';

describe('SNMP Configuration Workflow Integration', () => {
  const serversConfigPath = path.join(__dirname, '../../../servers.json');
  let originalServersConfig: any[] = [];

  beforeEach(async () => {
    // Backup original config
    try {
      const configData = await fs.readFile(serversConfigPath, 'utf8');
      originalServersConfig = JSON.parse(configData);
    } catch (error) {
      // If file doesn't exist or is invalid, start with empty array
      originalServersConfig = [];
    }
  });

  afterEach(async () => {
    // Restore original config
    await fs.writeFile(serversConfigPath, JSON.stringify(originalServersConfig, null, 2));
  });

  describe('Backend validation workflow', () => {
    test('should validate server creation with SNMP configuration', async () => {
      const serverWithSnmp = {
        name: 'Test Server with SNMP',
        ip: '192.168.1.100',
        dnsAddress: 'test-snmp.local',
        consecutiveSuccesses: 3,
        consecutiveFailures: 3,
        snmpConfig: {
          enabled: true,
          community: 'public',
          storageIndexes: [1, 2, 3],
          disks: [{ index: 1, name: 'C:' }]
        }
      };

      const errors = validateServerConfig(serverWithSnmp);
      expect(errors).toBeNull();
    });

    test('should validate server creation without SNMP configuration', async () => {
      const serverWithoutSnmp = {
        name: 'Test Server without SNMP',
        ip: '192.168.1.101',
        dnsAddress: 'test-no-snmp.local',
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithoutSnmp);
      expect(errors).toBeNull();
    });

    test('should reject invalid SNMP configuration', async () => {
      const serverWithInvalidSnmp = {
        name: 'Test Server with Invalid SNMP',
        ip: '192.168.1.102',
        dnsAddress: 'test-invalid-snmp.local',
        consecutiveSuccesses: 3,
        consecutiveFailures: 3,
        snmpConfig: {
          enabled: true,
          // Missing required community string
          storageIndexes: [1, 2, 3]
        }
      };

      const errors = validateServerConfig(serverWithInvalidSnmp);
      expect(errors).not.toBeNull();
      expect(errors!['snmpConfig.community']).toBe('SNMP community string is required when SNMP is enabled');
    });
  });

  describe('SNMP configuration state transitions', () => {
    test('should handle transition from no SNMP to enabled SNMP', async () => {
      // Step 1: Create server without SNMP
      const serverWithoutSnmp = {
        name: 'Server Initially No SNMP',
        ip: '192.168.1.200',
        dnsAddress: 'no-snmp.local',
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      // Validate initial state
      let errors = validateServerConfig(serverWithoutSnmp);
      expect(errors).toBeNull();

      // Step 2: Add SNMP configuration
      const serverWithSnmp = {
        ...serverWithoutSnmp,
        snmpConfig: {
          enabled: true,
          community: 'public',
          storageIndexes: [1, 2],
          disks: []
        }
      };

      // Validate transition
      errors = validateServerConfig(serverWithSnmp);
      expect(errors).toBeNull();
    });

    test('should handle transition from enabled SNMP to disabled SNMP', async () => {
      // Step 1: Create server with SNMP enabled
      const serverWithSnmp = {
        name: 'Server Initially With SNMP',
        ip: '192.168.1.201',
        dnsAddress: 'with-snmp.local',
        consecutiveSuccesses: 3,
        consecutiveFailures: 3,
        snmpConfig: {
          enabled: true,
          community: 'public',
          storageIndexes: [1, 2],
          disks: []
        }
      };

      // Validate initial state
      let errors = validateServerConfig(serverWithSnmp);
      expect(errors).toBeNull();

      // Step 2: Disable SNMP
      const serverWithSnmpDisabled = {
        ...serverWithSnmp,
        snmpConfig: {
          ...serverWithSnmp.snmpConfig,
          enabled: false
        }
      };

      // Validate transition
      errors = validateServerConfig(serverWithSnmpDisabled);
      expect(errors).toBeNull();
    });
  });

  describe('Partial SNMP configuration handling', () => {
    test('should validate partial SNMP configuration when disabled', async () => {
      const serverWithPartialSnmp = {
        name: 'Server with Partial SNMP',
        ip: '192.168.1.202',
        dnsAddress: 'partial-snmp.local',
        consecutiveSuccesses: 3,
        consecutiveFailures: 3,
        snmpConfig: {
          enabled: false,
          // When disabled, other fields can be missing or incomplete
          storageIndexes: [1, 2] // This should be allowed when disabled
        }
      };

      const errors = validateServerConfig(serverWithPartialSnmp);
      expect(errors).toBeNull();
    });

    test('should reject partial SNMP configuration when enabled', async () => {
      const serverWithPartialEnabledSnmp = {
        name: 'Server with Partial Enabled SNMP',
        ip: '192.168.1.203',
        dnsAddress: 'partial-enabled-snmp.local',
        consecutiveSuccesses: 3,
        consecutiveFailures: 3,
        snmpConfig: {
          enabled: true,
          // Missing required community string
          storageIndexes: [1, 2]
        }
      };

      const errors = validateServerConfig(serverWithPartialEnabledSnmp);
      expect(errors).not.toBeNull();
      expect(errors!['snmpConfig.community']).toBe('SNMP community string is required when SNMP is enabled');
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle empty SNMP configuration object', async () => {
      const serverWithEmptySnmp = {
        name: 'Server with Empty SNMP',
        ip: '192.168.1.204',
        dnsAddress: 'empty-snmp.local',
        consecutiveSuccesses: 3,
        consecutiveFailures: 3,
        snmpConfig: {} // Empty object should be treated as disabled
      };

      const errors = validateServerConfig(serverWithEmptySnmp);
      expect(errors).toBeNull();
    });

    test('should handle SNMP configuration with only enabled flag', async () => {
      const serverWithOnlyEnabled = {
        name: 'Server with Only Enabled',
        ip: '192.168.1.205',
        dnsAddress: 'only-enabled.local',
        consecutiveSuccesses: 3,
        consecutiveFailures: 3,
        snmpConfig: {
          enabled: true
          // Missing other required fields for enabled SNMP
        }
      };

      const errors = validateServerConfig(serverWithOnlyEnabled);
      expect(errors).not.toBeNull();
      expect(errors!['snmpConfig.community']).toBe('SNMP community string is required when SNMP is enabled');
    });

    test('should handle invalid storage indexes gracefully', async () => {
      const serverWithInvalidStorage = {
        name: 'Server with Invalid Storage',
        ip: '192.168.1.206',
        dnsAddress: 'invalid-storage.local',
        consecutiveSuccesses: 3,
        consecutiveFailures: 3,
        snmpConfig: {
          enabled: true,
          community: 'public',
          storageIndexes: [1, 'invalid', -2, 3] // Mixed valid/invalid values
        }
      };

      const errors = validateServerConfig(serverWithInvalidStorage);
      expect(errors).not.toBeNull();
      expect(errors!['snmpConfig.storageIndexes']).toBe('All storage indexes must be non-negative numbers');
    });

    test('should handle invalid disk configurations gracefully', async () => {
      const serverWithInvalidDisks = {
        name: 'Server with Invalid Disks',
        ip: '192.168.1.207',
        dnsAddress: 'invalid-disks.local',
        consecutiveSuccesses: 3,
        consecutiveFailures: 3,
        snmpConfig: {
          enabled: true,
          community: 'public',
          storageIndexes: [1],
          disks: [
            { index: 1, name: 'C:' },
            { index: -1, name: 'D:' }, // Invalid negative index
            { index: 2, name: 123 } // Invalid name type
          ]
        }
      };

      const errors = validateServerConfig(serverWithInvalidDisks);
      expect(errors).not.toBeNull();
      expect(errors!['snmpConfig.disks.1.index']).toBe('Disk index must be a non-negative number');
      expect(errors!['snmpConfig.disks.2.name']).toBe('Disk name must be a string');
    });
  });

  describe('Real-world scenarios', () => {
    test('should handle typical server configuration workflow', async () => {
      // Scenario: Admin creates server, then later adds SNMP monitoring

      // Step 1: Create basic server
      const basicServer = {
        name: 'Production Web Server',
        ip: '10.0.1.10',
        dnsAddress: 'web-prod.company.com',
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      let errors = validateServerConfig(basicServer);
      expect(errors).toBeNull();

      // Step 2: Later, admin adds SNMP monitoring
      const serverWithSnmp = {
        ...basicServer,
        snmpConfig: {
          enabled: true,
          community: 'secret-community',
          storageIndexes: [1, 2, 5],
          disks: [
            { index: 1, name: 'C:' },
            { index: 2, name: 'D:' },
            { index: 5, name: 'E:' }
          ]
        }
      };

      errors = validateServerConfig(serverWithSnmp);
      expect(errors).toBeNull();

      // Step 3: Admin temporarily disables SNMP during maintenance
      const serverWithSnmpDisabled = {
        ...serverWithSnmp,
        snmpConfig: {
          ...serverWithSnmp.snmpConfig,
          enabled: false
        }
      };

      errors = validateServerConfig(serverWithSnmpDisabled);
      expect(errors).toBeNull();

      // Step 4: Admin re-enables SNMP with modified configuration
      const serverWithModifiedSnmp = {
        ...serverWithSnmpDisabled,
        snmpConfig: {
          enabled: true,
          community: 'new-community', // Changed community
          storageIndexes: [1, 2, 5, 6], // Added new disk
          disks: [
            { index: 1, name: 'C:' },
            { index: 2, name: 'D:' },
            { index: 5, name: 'E:' },
            { index: 6, name: 'F:' }
          ]
        }
      };

      errors = validateServerConfig(serverWithModifiedSnmp);
      expect(errors).toBeNull();
    });

    test('should handle migration from existing servers with partial SNMP data', async () => {
      // Scenario: Data migration where some servers have incomplete SNMP configs

      const serversWithPartialSnmp = [
        {
          name: 'Server 1 - Complete SNMP',
          ip: '192.168.1.10',
          dnsAddress: 'server1.local',
          consecutiveSuccesses: 3,
          consecutiveFailures: 3,
          snmpConfig: {
            enabled: true,
            community: 'public',
            storageIndexes: [1, 2],
            disks: []
          }
        },
        {
          name: 'Server 2 - No SNMP',
          ip: '192.168.1.11',
          dnsAddress: 'server2.local',
          consecutiveSuccesses: 3,
          consecutiveFailures: 3
          // No snmpConfig property
        },
        {
          name: 'Server 3 - Disabled SNMP',
          ip: '192.168.1.12',
          dnsAddress: 'server3.local',
          consecutiveSuccesses: 3,
          consecutiveFailures: 3,
          snmpConfig: {
            enabled: false,
            community: 'old-community',
            storageIndexes: [1] // Should be allowed when disabled
          }
        },
        {
          name: 'Server 4 - Partial SNMP',
          ip: '192.168.1.13',
          dnsAddress: 'server4.local',
          consecutiveSuccesses: 3,
          consecutiveFailures: 3,
          snmpConfig: {} // Empty object
        }
      ];

      // All servers should validate successfully
      serversWithPartialSnmp.forEach((server, index) => {
        const errors = validateServerConfig(server);
        expect(errors).toBeNull();
      });
    });
  });
});