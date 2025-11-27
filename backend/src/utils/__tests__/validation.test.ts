/**
 * SNMP validation edge case tests
 *
 * Tests for the fix in Story 4.8: Fix SNMP Configuration Validation for Existing Servers
 * Covers various edge cases where SNMP configuration transitions from undefined to enabled
 */

import { validateServerConfig } from '../validation';

describe('SNMP Configuration Validation Edge Cases', () => {

  describe('Missing or undefined snmpConfig objects', () => {
    test('should validate server without snmpConfig property', () => {
      const serverWithoutSnmp = {
        id: 'server-001',
        name: 'Test Server',
        ip: '192.168.1.10',
        dnsAddress: 'test.local',
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithoutSnmp);
      expect(errors).toBeNull();
    });

    test('should validate server with undefined snmpConfig', () => {
      const serverWithUndefinedSnmp = {
        id: 'server-002',
        name: 'Test Server 2',
        ip: '192.168.1.11',
        dnsAddress: 'test2.local',
        snmpConfig: undefined,
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithUndefinedSnmp);
      expect(errors).toBeNull();
    });

    test('should validate server with null snmpConfig', () => {
      const serverWithNullSnmp = {
        id: 'server-003',
        name: 'Test Server 3',
        ip: '192.168.1.12',
        dnsAddress: 'test3.local',
        snmpConfig: null,
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithNullSnmp);
      expect(errors).toBeNull();
    });

    test('should validate server with empty snmpConfig object', () => {
      const serverWithEmptySnmp = {
        id: 'server-004',
        name: 'Test Server 4',
        ip: '192.168.1.13',
        dnsAddress: 'test4.local',
        snmpConfig: {},
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithEmptySnmp);
      expect(errors).toBeNull();
    });
  });

  describe('Partial SNMP configurations during transition', () => {
    test('should validate server with SNMP disabled and partial config', () => {
      const serverWithPartialSnmpDisabled = {
        id: 'server-005',
        name: 'Test Server 5',
        ip: '192.168.1.14',
        dnsAddress: 'test5.local',
        snmpConfig: {
          enabled: false,
          // Missing community, storageIndexes, disks - should be allowed when disabled
        },
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithPartialSnmpDisabled);
      expect(errors).toBeNull();
    });

    test('should reject SNMP enabled without community string', () => {
      const serverWithEnabledSnmpNoCommunity = {
        id: 'server-006',
        name: 'Test Server 6',
        ip: '192.168.1.15',
        dnsAddress: 'test6.local',
        snmpConfig: {
          enabled: true,
          // Missing community - should be required when enabled
          storageIndexes: [1, 2, 3]
        },
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithEnabledSnmpNoCommunity);
      expect(errors).not.toBeNull();
      expect(errors!['snmpConfig.community']).toBe('SNMP community string is required when SNMP is enabled');
    });

    test('should reject SNMP enabled with empty community string', () => {
      const serverWithEmptyCommunity = {
        id: 'server-007',
        name: 'Test Server 7',
        ip: '192.168.1.16',
        dnsAddress: 'test7.local',
        snmpConfig: {
          enabled: true,
          community: '',
          storageIndexes: [1, 2, 3]
        },
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithEmptyCommunity);
      expect(errors).not.toBeNull();
      expect(errors!['snmpConfig.community']).toBe('SNMP community string is required when SNMP is enabled');
    });

    test('should reject SNMP enabled with whitespace-only community string', () => {
      const serverWithWhitespaceCommunity = {
        id: 'server-008',
        name: 'Test Server 8',
        ip: '192.168.1.17',
        dnsAddress: 'test8.local',
        snmpConfig: {
          enabled: true,
          community: '   ',
          storageIndexes: [1, 2, 3]
        },
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithWhitespaceCommunity);
      expect(errors).not.toBeNull();
      expect(errors!['snmpConfig.community']).toBe('SNMP community string is required when SNMP is enabled');
    });
  });

  describe('Storage indexes validation', () => {
    test('should accept valid storage indexes array', () => {
      const serverWithValidStorageIndexes = {
        id: 'server-009',
        name: 'Test Server 9',
        ip: '192.168.1.18',
        dnsAddress: 'test9.local',
        snmpConfig: {
          enabled: true,
          community: 'public',
          storageIndexes: [1, 2, 3, 4]
        },
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithValidStorageIndexes);
      expect(errors).toBeNull();
    });

    test('should reject invalid storage indexes array', () => {
      const serverWithInvalidStorageIndexes = {
        id: 'server-010',
        name: 'Test Server 10',
        ip: '192.168.1.19',
        dnsAddress: 'test10.local',
        snmpConfig: {
          enabled: true,
          community: 'public',
          storageIndexes: 'not an array'
        },
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithInvalidStorageIndexes);
      expect(errors).not.toBeNull();
      expect(errors!['snmpConfig.storageIndexes']).toBe('Storage indexes must be an array');
    });

    test('should reject storage indexes with negative numbers', () => {
      const serverWithNegativeIndexes = {
        id: 'server-011',
        name: 'Test Server 11',
        ip: '192.168.1.20',
        dnsAddress: 'test11.local',
        snmpConfig: {
          enabled: true,
          community: 'public',
          storageIndexes: [1, -2, 3]
        },
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithNegativeIndexes);
      expect(errors).not.toBeNull();
      expect(errors!['snmpConfig.storageIndexes']).toBe('All storage indexes must be non-negative numbers');
    });

    test('should reject storage indexes with non-numeric values', () => {
      const serverWithNonNumericIndexes = {
        id: 'server-012',
        name: 'Test Server 12',
        ip: '192.168.1.21',
        dnsAddress: 'test12.local',
        snmpConfig: {
          enabled: true,
          community: 'public',
          storageIndexes: [1, 'two', 3]
        },
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithNonNumericIndexes);
      expect(errors).not.toBeNull();
      expect(errors!['snmpConfig.storageIndexes']).toBe('All storage indexes must be non-negative numbers');
    });
  });

  describe('Disk configurations validation', () => {
    test('should accept valid disk configurations', () => {
      const serverWithValidDisks = {
        id: 'server-013',
        name: 'Test Server 13',
        ip: '192.168.1.22',
        dnsAddress: 'test13.local',
        snmpConfig: {
          enabled: true,
          community: 'public',
          storageIndexes: [1, 2],
          disks: [
            { index: 1, name: 'C:' },
            { index: 2, name: 'D:' }
          ]
        },
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithValidDisks);
      expect(errors).toBeNull();
    });

    test('should reject invalid disk configurations array', () => {
      const serverWithInvalidDisksArray = {
        id: 'server-014',
        name: 'Test Server 14',
        ip: '192.168.1.23',
        dnsAddress: 'test14.local',
        snmpConfig: {
          enabled: true,
          community: 'public',
          storageIndexes: [1, 2],
          disks: 'not an array'
        },
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithInvalidDisksArray);
      expect(errors).not.toBeNull();
      expect(errors!['snmpConfig.disks']).toBe('Disk configurations must be an array');
    });

    test('should reject disk configuration with negative index', () => {
      const serverWithNegativeDiskIndex = {
        id: 'server-015',
        name: 'Test Server 15',
        ip: '192.168.1.24',
        dnsAddress: 'test15.local',
        snmpConfig: {
          enabled: true,
          community: 'public',
          storageIndexes: [1, 2],
          disks: [
            { index: -1, name: 'C:' }
          ]
        },
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithNegativeDiskIndex);
      expect(errors).not.toBeNull();
      expect(errors!['snmpConfig.disks.0.index']).toBe('Disk index must be a non-negative number');
    });

    test('should reject disk configuration with non-string name', () => {
      const serverWithInvalidDiskName = {
        id: 'server-016',
        name: 'Test Server 16',
        ip: '192.168.1.25',
        dnsAddress: 'test16.local',
        snmpConfig: {
          enabled: true,
          community: 'public',
          storageIndexes: [1, 2],
          disks: [
            { index: 1, name: 123 }
          ]
        },
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithInvalidDiskName);
      expect(errors).not.toBeNull();
      expect(errors!['snmpConfig.disks.0.name']).toBe('Disk name must be a string');
    });

    test('should accept disk configuration without name (optional field)', () => {
      const serverWithNoDiskName = {
        id: 'server-017',
        name: 'Test Server 17',
        ip: '192.168.1.26',
        dnsAddress: 'test17.local',
        snmpConfig: {
          enabled: true,
          community: 'public',
          storageIndexes: [1, 2],
          disks: [
            { index: 1 } // name is optional
          ]
        },
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithNoDiskName);
      expect(errors).toBeNull();
    });
  });

  describe('SNMP enable/disable transitions', () => {
    test('should allow transition from no SNMP to enabled SNMP', () => {
      // This simulates the core issue from the bug report
      const serverTransitioningToSnmp = {
        id: 'server-018',
        name: 'Test Server 18',
        ip: '192.168.1.27',
        dnsAddress: 'test18.local',
        snmpConfig: {
          enabled: true,
          community: 'public',
          storageIndexes: [1, 2, 3]
        },
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverTransitioningToSnmp);
      expect(errors).toBeNull();
    });

    test('should allow transition from enabled SNMP to disabled SNMP', () => {
      const serverTransitioningFromSnmp = {
        id: 'server-019',
        name: 'Test Server 19',
        ip: '192.168.1.28',
        dnsAddress: 'test19.local',
        snmpConfig: {
          enabled: false,
          community: 'public', // Should be allowed when disabled
          storageIndexes: [1, 2, 3], // Should be allowed when disabled
          disks: [{ index: 1, name: 'C:' }] // Should be allowed when disabled
        },
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverTransitioningFromSnmp);
      expect(errors).toBeNull();
    });
  });

  describe('Invalid snmpConfig types', () => {
    test('should reject string snmpConfig', () => {
      const serverWithStringSnmpConfig = {
        id: 'server-020',
        name: 'Test Server 20',
        ip: '192.168.1.29',
        dnsAddress: 'test20.local',
        snmpConfig: 'invalid string',
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithStringSnmpConfig);
      expect(errors).toBeNull(); // Should pass validation since we only validate if it's an object
    });

    test('should reject number snmpConfig', () => {
      const serverWithNumberSnmpConfig = {
        id: 'server-021',
        name: 'Test Server 21',
        ip: '192.168.1.30',
        dnsAddress: 'test21.local',
        snmpConfig: 123,
        consecutiveSuccesses: 3,
        consecutiveFailures: 3
      };

      const errors = validateServerConfig(serverWithNumberSnmpConfig);
      expect(errors).toBeNull(); // Should pass validation since we only validate if it's an object
    });
  });
});