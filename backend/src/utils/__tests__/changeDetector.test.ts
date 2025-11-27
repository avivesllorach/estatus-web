import { ServerConfig } from '../../types/server';
import { detectServerChanges, detectGroupChanges, generateChangeSummary } from '../changeDetector';

describe('detectServerChanges', () => {
  const baseServer: ServerConfig = {
    id: 'server-001',
    name: 'Test Server',
    ip: '192.168.1.10',
    dnsAddress: 'test.local',
    snmp: {
      enabled: true,
      storageIndexes: [1, 2, 3],
      disks: [
        { index: 1, name: 'C:' },
        { index: 2, name: 'D:' },
      ],
    },
    netapp: {
      enabled: false,
      apiType: 'rest',
      username: '',
      password: '',
      luns: [],
    },
  };

  it('should detect no changes when servers are identical', () => {
    const changes = detectServerChanges(baseServer, { ...baseServer });

    expect(changes).toHaveLength(0);
  });

  it('should detect basic field changes', () => {
    const modifiedServer: ServerConfig = {
      ...baseServer,
      name: 'Updated Server',
      ip: '192.168.1.20',
    };

    const changes = detectServerChanges(baseServer, modifiedServer);

    expect(changes).toHaveLength(2);
    expect(changes).toEqual(
      expect.arrayContaining([
        { field: 'name', from: 'Test Server', to: 'Updated Server' },
        { field: 'ip', from: '192.168.1.10', to: '192.168.1.20' },
      ]),
    );
  });

  it('should detect SNMP configuration changes', () => {
    const modifiedServer: ServerConfig = {
      ...baseServer,
      snmp: {
        enabled: false,
        storageIndexes: [1, 2, 3, 4],
        disks: [
          { index: 1, name: 'C:' },
          { index: 2, name: 'D:' },
          { index: 3, name: 'E:' },
        ],
      },
    };

    const changes = detectServerChanges(baseServer, modifiedServer);

    expect(changes).toHaveLength(3);
    expect(changes).toEqual(
      expect.arrayContaining([
        { field: 'snmp.enabled', from: true, to: false },
        { field: 'snmp.storageIndexes', from: [1, 2, 3], to: [1, 2, 3, 4] },
        { field: 'snmp.disks', from: expect.any(Array), to: expect.any(Array) },
      ]),
    );
  });

  it('should detect NetApp configuration changes', () => {
    const modifiedServer: ServerConfig = {
      ...baseServer,
      netapp: {
        enabled: true,
        apiType: 'zapi',
        username: 'admin',
        password: 'secret',
        luns: [
          { name: 'lun1', path: '/vol/vol1/lun1' },
          { name: 'lun2', path: '/vol/vol1/lun2' },
        ],
      },
    };

    const changes = detectServerChanges(baseServer, modifiedServer);

    expect(changes).toHaveLength(5);
    expect(changes).toEqual(
      expect.arrayContaining([
        { field: 'netapp.enabled', from: false, to: true },
        { field: 'netapp.apiType', from: 'rest', to: 'zapi' },
        { field: 'netapp.username', from: '', to: 'admin' },
        { field: 'netapp.password', from: '', to: 'secret' },
        { field: 'netapp.luns', from: [], to: expect.any(Array) },
      ]),
    );
  });

  it('should handle addition of SNMP configuration', () => {
    const serverWithoutSnmp = { ...baseServer };
    delete serverWithoutSnmp.snmp;

    const changes = detectServerChanges(serverWithoutSnmp, baseServer);

    expect(changes.length).toBeGreaterThan(0);
    expect(changes).toEqual(
      expect.arrayContaining([
        { field: 'snmp.enabled', to: true },
        { field: 'snmp.storageIndexes', to: [1, 2, 3] },
      ]),
    );
  });

  it('should handle removal of SNMP configuration', () => {
    const serverWithoutSnmp = { ...baseServer };
    delete serverWithoutSnmp.snmp;

    const changes = detectServerChanges(baseServer, serverWithoutSnmp);

    expect(changes.length).toBeGreaterThan(0);
    expect(changes).toEqual(
      expect.arrayContaining([
        { field: 'snmp.enabled', from: true },
        { field: 'snmp.storageIndexes', from: [1, 2, 3] },
      ]),
    );
  });
});

describe('detectGroupChanges', () => {
  const baseGroup = {
    id: 'group-1',
    name: 'Test Group',
    order: 1,
    serverIds: ['server-001', 'server-002'],
  };

  it('should detect no changes when groups are identical', () => {
    const changes = detectGroupChanges(baseGroup, { ...baseGroup });

    expect(changes).toHaveLength(0);
  });

  it('should detect basic field changes', () => {
    const modifiedGroup = {
      ...baseGroup,
      name: 'Updated Group',
      order: 2,
    };

    const changes = detectGroupChanges(baseGroup, modifiedGroup);

    expect(changes).toHaveLength(2);
    expect(changes).toEqual(
      expect.arrayContaining([
        { field: 'name', from: 'Test Group', to: 'Updated Group' },
        { field: 'order', from: 1, to: 2 },
      ]),
    );
  });

  it('should detect server assignment changes', () => {
    const modifiedGroup = {
      ...baseGroup,
      serverIds: ['server-001', 'server-003'],
    };

    const changes = detectGroupChanges(baseGroup, modifiedGroup);

    expect(changes).toHaveLength(1);
    expect(changes).toEqual([
      {
        field: 'serverIds',
        from: ['server-001', 'server-002'],
        to: ['server-001', 'server-003'],
      },
    ]);
  });

  it('should detect server assignment changes regardless of order', () => {
    const modifiedGroup = {
      ...baseGroup,
      serverIds: ['server-002', 'server-001'], // Same servers, different order
    };

    const changes = detectGroupChanges(baseGroup, modifiedGroup);

    expect(changes).toHaveLength(0);
  });

  it('should detect addition of servers to group', () => {
    const modifiedGroup = {
      ...baseGroup,
      serverIds: ['server-001', 'server-002', 'server-003'],
    };

    const changes = detectGroupChanges(baseGroup, modifiedGroup);

    expect(changes).toHaveLength(1);
    expect(changes).toEqual([
      {
        field: 'serverIds',
        from: ['server-001', 'server-002'],
        to: ['server-001', 'server-002', 'server-003'],
      },
    ]);
  });

  it('should detect removal of servers from group', () => {
    const modifiedGroup = {
      ...baseGroup,
      serverIds: ['server-001'],
    };

    const changes = detectGroupChanges(baseGroup, modifiedGroup);

    expect(changes).toHaveLength(1);
    expect(changes).toEqual([
      {
        field: 'serverIds',
        from: ['server-001', 'server-002'],
        to: ['server-001'],
      },
    ]);
  });

  it('should handle empty server arrays', () => {
    const groupWithNoServers = {
      ...baseGroup,
      serverIds: [],
    };

    const changes = detectGroupChanges(baseGroup, groupWithNoServers);

    expect(changes).toHaveLength(1);
    expect(changes).toEqual([
      {
        field: 'serverIds',
        from: ['server-001', 'server-002'],
        to: [],
      },
    ]);
  });
});

describe('generateChangeSummary', () => {
  it('should generate summary for group changes', () => {
    const changes = [
      { field: 'name', from: 'Old Group', to: 'New Group' },
      { field: 'serverIds', from: ['server-1'], to: ['server-1', 'server-2'] },
    ];

    const summary = generateChangeSummary(changes, 'GROUP');

    expect(summary).toContain('GROUP changes:');
    expect(summary).toContain('name changed from "Old Group" to "New Group"');
    expect(summary).toContain('serverIds changed from [1 items] to [2 items]');
  });

  it('should format array values correctly', () => {
    const changes = [
      { field: 'arrayField', from: ['a', 'b'], to: ['a', 'b', 'c', 'd'] },
    ];

    const summary = generateChangeSummary(changes, 'SERVER');

    expect(summary).toContain('arrayField changed from [2 items] to [4 items]');
  });

  it('should format object values correctly', () => {
    const changes = [
      { field: 'objectField', from: { key: 'value' }, to: { key: 'newValue', other: 'data' } },
    ];

    const summary = generateChangeSummary(changes, 'SERVER');

    expect(summary).toContain('objectField changed from {...} to {...}');
  });

  it('should handle boolean values', () => {
    const changes = [
      { field: 'enabled', from: false, to: true },
    ];

    const summary = generateChangeSummary(changes, 'SERVER');

    expect(summary).toContain('enabled changed from false to true');
  });

  it('should handle number values', () => {
    const changes = [
      { field: 'order', from: 1, to: 5 },
    ];

    const summary = generateChangeSummary(changes, 'GROUP');

    expect(summary).toContain('order changed from 1 to 5');
  });

  it('should handle null values', () => {
    const changes = [
      { field: 'description', from: null, to: 'New description' },
    ];

    const summary = generateChangeSummary(changes, 'SERVER');

    expect(summary).toContain('description changed from null to "New description"');
  });

  it('should handle empty arrays and objects', () => {
    const changes = [
      { field: 'emptyArray', from: [], to: ['item'] },
      { field: 'emptyObject', from: {}, to: { key: 'value' } },
    ];

    const summary = generateChangeSummary(changes, 'SERVER');

    expect(summary).toContain('emptyArray changed from [0 items] to [1 items]');
    expect(summary).toContain('emptyObject changed from {} to {...}');
  });

  it('should return "No changes detected" for empty changes array', () => {
    const summary = generateChangeSummary([], 'SERVER');

    expect(summary).toBe('No changes detected');
  });
});