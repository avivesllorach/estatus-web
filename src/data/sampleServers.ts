interface DiskInfo {
  total: number;
  free: number;
  used: number;
  percentage: number;
}

interface ServerData {
  name: string;
  ip: string;
  isOnline: boolean;
  diskInfo?: DiskInfo[] | null;
}

export const sampleServers: ServerData[] = [
  // Row 1
  { name: "ARAGO 5", ip: "192.168.1.10", isOnline: true, diskInfo: [{ total: 1000, free: 600, used: 400, percentage: 40 }] },
  { name: "PROVENÇA 2", ip: "192.168.1.11", isOnline: true, diskInfo: [{ total: 500, free: 400, used: 100, percentage: 20 }] },
  { name: "LDAP 1", ip: "192.168.1.12", isOnline: true, diskInfo: [{ total: 2000, free: 800, used: 1200, percentage: 60 }] },
  { name: "CAS 1", ip: "192.168.1.13", isOnline: false, diskInfo: null },
  { name: "BACKUP 1", ip: "192.168.1.14", isOnline: true, diskInfo: [{ total: 5000, free: 1000, used: 4000, percentage: 80 }] },
  { name: "MONITOR 2", ip: "192.168.1.15", isOnline: true, diskInfo: [{ total: 1000, free: 900, used: 100, percentage: 10 }] },
  { name: "VPN 3", ip: "192.168.1.16", isOnline: true, diskInfo: [{ total: 200, free: 50, used: 150, percentage: 75 }] },
  { name: "DNS 1", ip: "192.168.1.17", isOnline: false, diskInfo: null },
  { name: "PROXY 4", ip: "192.168.1.18", isOnline: true, diskInfo: [{ total: 800, free: 200, used: 600, percentage: 75 }] },
  { name: "LOG 2", ip: "192.168.1.19", isOnline: true, diskInfo: [{ total: 3000, free: 300, used: 2700, percentage: 90 }] },

  // Row 2
  { name: "MOODLE 7", ip: "192.168.1.20", isOnline: true, diskInfo: [{ total: 1500, free: 750, used: 750, percentage: 50 }] },
  { name: "RADIUS 2", ip: "192.168.1.21", isOnline: true, diskInfo: [{ total: 400, free: 320, used: 80, percentage: 20 }] },
  { name: "SMTP 1", ip: "192.168.1.22", isOnline: true, diskInfo: [{ total: 600, free: 180, used: 420, percentage: 70 }] },
  { name: "POP3 1", ip: "192.168.1.23", isOnline: false, diskInfo: null },
  { name: "IMAP 2", ip: "192.168.1.24", isOnline: true, diskInfo: [{ total: 800, free: 640, used: 160, percentage: 20 }] },
  { name: "NGINX 3", ip: "192.168.1.25", isOnline: true, diskInfo: [{ total: 300, free: 90, used: 210, percentage: 70 }] },
  { name: "APACHE 4", ip: "192.168.1.26", isOnline: true, diskInfo: [{ total: 500, free: 450, used: 50, percentage: 10 }] },
  { name: "MYSQL 5", ip: "192.168.1.27", isOnline: true, diskInfo: [{ total: 2000, free: 200, used: 1800, percentage: 90 }] },
  { name: "REDIS 1", ip: "192.168.1.28", isOnline: false, diskInfo: null },
  { name: "MONGO 2", ip: "192.168.1.29", isOnline: true, diskInfo: [{ total: 1000, free: 300, used: 700, percentage: 70 }] },

  // Row 3
  { name: "ATLAS 3", ip: "192.168.1.30", isOnline: true, diskInfo: [{ total: 4000, free: 1200, used: 2800, percentage: 70 }] },
  { name: "CAMPUS 3", ip: "192.168.1.31", isOnline: true, diskInfo: [{ total: 1200, free: 960, used: 240, percentage: 20 }] },
  { name: "IRENE 4", ip: "192.168.1.32", isOnline: true, diskInfo: [{ total: 800, free: 160, used: 640, percentage: 80 }] },
  { name: "DOCKER 1", ip: "192.168.1.33", isOnline: true, diskInfo: [{ total: 2500, free: 1250, used: 1250, percentage: 50 }] },
  { name: "K8S 2", ip: "192.168.1.34", isOnline: false, diskInfo: null },
  { name: "JENKINS 1", ip: "192.168.1.35", isOnline: true, diskInfo: [{ total: 1000, free: 100, used: 900, percentage: 90 }] },
  { name: "GITLAB 3", ip: "192.168.1.36", isOnline: true, diskInfo: [{ total: 3000, free: 900, used: 2100, percentage: 70 }] },
  { name: "SONAR 1", ip: "192.168.1.37", isOnline: true, diskInfo: [{ total: 500, free: 400, used: 100, percentage: 20 }] },
  { name: "NEXUS 2", ip: "192.168.1.38", isOnline: true, diskInfo: [{ total: 1500, free: 225, used: 1275, percentage: 85 }] },
  { name: "VAULT 1", ip: "192.168.1.39", isOnline: false, diskInfo: null },

  // Row 4
  { name: "AD 4", ip: "192.168.1.40", isOnline: true, diskInfo: [{ total: 1000, free: 500, used: 500, percentage: 50 }] },
  { name: "BI 2", ip: "192.168.1.41", isOnline: true, diskInfo: [{ total: 6000, free: 1200, used: 4800, percentage: 80 }] },
  { name: "COMMVAULT 2", ip: "192.168.1.42", isOnline: true, diskInfo: [{ total: 10000, free: 1000, used: 9000, percentage: 90 }] },
  { name: "RELAY BD 2", ip: "192.168.1.43", isOnline: true, diskInfo: [{ total: 2000, free: 1400, used: 600, percentage: 30 }] },
  { name: "FILESERVER 3", ip: "192.168.1.44", isOnline: true, diskInfo: [{ total: 8000, free: 2400, used: 5600, percentage: 70 }] },
  { name: "PRINT 1", ip: "192.168.1.45", isOnline: false, diskInfo: null },
  { name: "SCAN 2", ip: "192.168.1.46", isOnline: true, diskInfo: [{ total: 300, free: 240, used: 60, percentage: 20 }] },
  { name: "FTP 3", ip: "192.168.1.47", isOnline: true, diskInfo: [{ total: 1000, free: 100, used: 900, percentage: 90 }] },
  { name: "SFTP 1", ip: "192.168.1.48", isOnline: true, diskInfo: [{ total: 500, free: 350, used: 150, percentage: 30 }] },
  { name: "NFS 4", ip: "192.168.1.49", isOnline: true, diskInfo: [{ total: 4000, free: 800, used: 3200, percentage: 80 }] },
  { name: "SAMBA 1", ip: "192.168.1.50", isOnline: true, diskInfo: [{ total: 1500, free: 600, used: 900, percentage: 60 }] }
];