/**
 * Server Factory for Test Data Generation
 *
 * Generates ServerConfig objects with realistic test data.
 * Uses simple randomization (no external dependencies needed initially).
 *
 * Usage:
 * const server = createServer({ name: 'Test Server' });
 * const servers = createServers(5); // Generate 5 servers
 *
 * TODO: Install @faker-js/faker for more realistic data:
 * npm install -D @faker-js/faker
 */

interface SnmpConfig {
  enabled: boolean;
  community: string;
  storageIndexes: number[];
  diskNames: string[];
  disks?: Array<{
    name: string;
    oid: string;
  }>;
}

interface NetAppConfig {
  enabled: boolean;
  apiType: 'ontap' | 'rest';
  username: string;
  password: string;
  luns: string[];
}

export interface ServerConfig {
  id: string;
  name: string;
  ip: string;
  dnsAddress: string;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  snmp?: SnmpConfig;
  netapp?: NetAppConfig;
}

let serverCounter = 1;

/**
 * Reset server counter (useful in beforeEach)
 */
export function resetServerCounter(): void {
  serverCounter = 1;
}

/**
 * Generate a unique server ID
 */
function generateServerId(overrideId?: string): string {
  if (overrideId) return overrideId;
  const id = `server-${serverCounter.toString().padStart(3, '0')}`;
  serverCounter++;
  return id;
}

/**
 * Generate a random IPv4 address
 */
function generateIPv4(): string {
  const octet = () => Math.floor(Math.random() * 255) + 1;
  return `192.168.${octet()}.${octet()}`;
}

/**
 * Generate a random domain name
 */
function generateDomainName(prefix?: string): string {
  const randomPrefix = prefix || `server${Math.floor(Math.random() * 1000)}`;
  return `${randomPrefix}.local`;
}

/**
 * Create a ServerConfig object for testing
 *
 * @param overrides - Partial ServerConfig to override defaults
 * @returns Complete ServerConfig object
 */
export function createServer(overrides?: Partial<ServerConfig>): ServerConfig {
  const id = generateServerId(overrides?.id);
  const ip = overrides?.ip || generateIPv4();
  const name = overrides?.name || `Test Server ${id}`;
  const dnsAddress = overrides?.dnsAddress || generateDomainName(name.toLowerCase().replace(/\s+/g, '-'));

  return {
    id,
    name,
    ip,
    dnsAddress,
    consecutiveSuccesses: overrides?.consecutiveSuccesses ?? 3,
    consecutiveFailures: overrides?.consecutiveFailures ?? 3,
    snmp: overrides?.snmp || {
      enabled: false,
      community: 'public',
      storageIndexes: [],
      diskNames: [],
    },
    netapp: overrides?.netapp || {
      enabled: false,
      apiType: 'rest',
      username: '',
      password: '',
      luns: [],
    },
    ...overrides,
  };
}

/**
 * Create multiple ServerConfig objects
 *
 * @param count - Number of servers to create
 * @param overrides - Optional overrides for all servers
 * @returns Array of ServerConfig objects
 */
export function createServers(count: number, overrides?: Partial<ServerConfig>): ServerConfig[] {
  return Array.from({ length: count }, () => createServer(overrides));
}

/**
 * Create a server with SNMP monitoring enabled
 *
 * @param diskCount - Number of disks to monitor (default: 2)
 * @param overrides - Optional overrides
 * @returns ServerConfig with SNMP enabled
 */
export function createServerWithSNMP(diskCount = 2, overrides?: Partial<ServerConfig>): ServerConfig {
  const disks = Array.from({ length: diskCount }, (_, i) => ({
    name: `/dev/sda${i + 1}`,
    oid: `1.3.6.1.4.1.2021.9.1.${i + 1}`,
  }));

  return createServer({
    ...overrides,
    snmp: {
      enabled: true,
      community: 'public',
      storageIndexes: disks.map((_, i) => i + 1),
      diskNames: disks.map(d => d.name),
      disks,
    },
  });
}

/**
 * Create a server with NetApp LUN monitoring enabled
 *
 * @param lunCount - Number of LUNs to monitor (default: 2)
 * @param overrides - Optional overrides
 * @returns ServerConfig with NetApp enabled
 */
export function createServerWithNetApp(lunCount = 2, overrides?: Partial<ServerConfig>): ServerConfig {
  const luns = Array.from({ length: lunCount }, (_, i) => `/vol/vol${i + 1}/lun${i + 1}`);

  return createServer({
    ...overrides,
    netapp: {
      enabled: true,
      apiType: 'rest',
      username: 'admin',
      password: 'testpass',
      luns,
    },
  });
}
