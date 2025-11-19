// Monitoring configuration
export const PING_DELAY = 1000; // 1 second delay between continuous pings
export const PING_TIMEOUT = 5000; // 5 seconds
export const CONSECUTIVE_THRESHOLD = 4; // 4 consecutive failures/successes to change status
export const SNMP_INTERVAL = 60000; // 1 minute interval for SNMP disk monitoring
export const SNMP_COMMUNITY = 'M7rs54Ax'; // Global SNMP community string for all servers

// Server configuration
export const PORT = process.env.PORT || 3001;
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Export config paths for convenience
export { CONFIG_PATHS, isTestMode } from './file-paths';