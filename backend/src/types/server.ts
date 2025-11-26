export interface DiskConfig {
  index: number;
  name?: string; // Optional custom name for the disk
}

export interface SnmpConfig {
  enabled: boolean;
  community?: string; // SNMP community string (optional for backward compatibility)
  storageIndexes: number[]; // Up to 3 indexes for hrStorageIndex (legacy support)
  disks?: DiskConfig[]; // New format with disk names
  diskNames?: string[]; // Legacy format - array of disk names
}

export interface LunConfig {
  name: string;
  path: string; // LUN path in NetApp
}

export interface NetAppConfig {
  enabled: boolean;
  apiType?: 'rest' | 'zapi';
  username: string;
  password: string;
  luns: LunConfig[]; // Up to 3 LUNs per server
}

export interface ServerConfig {
  id: string;
  name: string;
  ip: string;
  dnsAddress: string;
  snmp?: SnmpConfig;
  netapp?: NetAppConfig;
}

export interface DiskInfo {
  total: number;
  free: number;
  used: number;
  percentage: number;
  description?: string; // From hrStorageDescr
  index?: number; // The hrStorageIndex
  name?: string; // Custom disk name from configuration
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

export interface PingResult {
  success: boolean;
  responseTime?: number;
  error?: string;
}

export interface SnmpResult {
  success: boolean;
  diskInfo?: DiskInfo[];
  error?: string;
}

export interface NetAppResult {
  success: boolean;
  diskInfo?: DiskInfo[];
  error?: string;
}

export interface StatusUpdate {
  serverId: string;
  name: string;
  ip: string;
  isOnline: boolean;
  previousStatus: boolean;
  timestamp: Date;
}

export interface DiskUpdate {
  serverId: string;
  name: string;
  diskInfo: DiskInfo[] | null;
  timestamp: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}