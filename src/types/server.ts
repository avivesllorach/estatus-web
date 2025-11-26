// Frontend server types (compatible with backend types)

export interface DiskConfig {
  index: number;
  name?: string;
}

export interface SnmpConfig {
  enabled: boolean;
  community?: string; // SNMP community string (optional for backward compatibility)
  storageIndexes: number[];
  disks?: DiskConfig[];
  diskNames?: string[]; // Legacy format - array of disk names
}

export interface LunConfig {
  name: string;
  path: string;
}

export interface NetAppConfig {
  enabled: boolean;
  apiType?: 'rest' | 'zapi';
  username: string;
  password: string;
  luns: LunConfig[];
}

// Frontend uses 'dns' for consistency with existing code
// Backend uses 'dnsAddress' - conversion happens at API boundary
export interface ServerConfig {
  id: string;
  name: string;
  ip: string;
  dns: string; // Maps to dnsAddress in backend
  consecutiveSuccesses?: number;
  consecutiveFailures?: number;
  snmp?: SnmpConfig;
  netapp?: NetAppConfig;
}

export interface DiskInfo {
  total: number;
  free: number;
  used: number;
  percentage: number;
  description?: string;
  index?: number;
  name?: string;
}

export interface ServerStatus {
  id: string;
  name: string;
  ip: string;
  isOnline: boolean;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  lastChecked: Date;
  lastStatusChange: Date;
  diskInfo?: DiskInfo[] | null;
}
