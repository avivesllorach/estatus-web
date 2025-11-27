import { ServerConfig } from '../types/server';

interface GroupConfig {
  id: string;
  name: string;
  order: number;
  serverIds: string[];
}

// Extended ServerConfig interface to include monitoring fields
interface ExtendedServerConfig extends ServerConfig {
  consecutiveSuccesses?: number;
  consecutiveFailures?: number;
}

export interface ConfigChange {
  field: string;
  from?: any;
  to?: any;
}

/**
 * Detect changes between two server configurations
 */
export function detectServerChanges(oldServer: ExtendedServerConfig, newServer: ExtendedServerConfig): ConfigChange[] {
  const changes: ConfigChange[] = [];

  // Compare basic fields
  if (oldServer.name !== newServer.name) {
    changes.push({
      field: 'name',
      from: oldServer.name,
      to: newServer.name,
    });
  }

  if (oldServer.ip !== newServer.ip) {
    changes.push({
      field: 'ip',
      from: oldServer.ip,
      to: newServer.ip,
    });
  }

  if (oldServer.dnsAddress !== newServer.dnsAddress) {
    changes.push({
      field: 'dnsAddress',
      from: oldServer.dnsAddress,
      to: newServer.dnsAddress,
    });
  }

  if (oldServer.consecutiveSuccesses !== newServer.consecutiveSuccesses) {
    changes.push({
      field: 'consecutiveSuccesses',
      from: oldServer.consecutiveSuccesses,
      to: newServer.consecutiveSuccesses,
    });
  }

  if (oldServer.consecutiveFailures !== newServer.consecutiveFailures) {
    changes.push({
      field: 'consecutiveFailures',
      from: oldServer.consecutiveFailures,
      to: newServer.consecutiveFailures,
    });
  }

  // Compare SNMP configuration
  const snmpChanges = detectConfigChanges(oldServer.snmp, newServer.snmp, 'snmp.');
  changes.push(...snmpChanges);

  // Compare NetApp configuration
  const netappChanges = detectConfigChanges(oldServer.netapp, newServer.netapp, 'netapp.');
  changes.push(...netappChanges);

  return changes;
}

/**
 * Detect changes between two group configurations
 */
export function detectGroupChanges(oldGroup: GroupConfig, newGroup: GroupConfig): ConfigChange[] {
  const changes: ConfigChange[] = [];

  // Compare basic fields
  const basicFields: (keyof GroupConfig)[] = ['name', 'order'];

  for (const field of basicFields) {
    if (JSON.stringify(oldGroup[field]) !== JSON.stringify(newGroup[field])) {
      changes.push({
        field,
        from: oldGroup[field],
        to: newGroup[field],
      });
    }
  }

  // Compare server assignments (sort to detect actual changes vs just order differences)
  const oldServerIds = [...(oldGroup.serverIds || [])].sort();
  const newServerIds = [...(newGroup.serverIds || [])].sort();

  if (JSON.stringify(oldServerIds) !== JSON.stringify(newServerIds)) {
    changes.push({
      field: 'serverIds',
      from: oldServerIds,
      to: newServerIds,
    });
  }

  return changes;
}

/**
 * Generic configuration change detector
 */
function detectConfigChanges(oldConfig: any, newConfig: any, prefix: string = ''): ConfigChange[] {
  const changes: ConfigChange[] = [];

  // Handle case where one or both configs are undefined/null
  if (!oldConfig && !newConfig) {
    return changes;
  }

  if (!oldConfig && newConfig) {
    // Config was added
    for (const [key, value] of Object.entries(newConfig)) {
      changes.push({
        field: prefix + key,
        to: value,
      });
    }
    return changes;
  }

  if (oldConfig && !newConfig) {
    // Config was removed
    for (const [key, value] of Object.entries(oldConfig)) {
      changes.push({
        field: prefix + key,
        from: value,
      });
    }
    return changes;
  }

  // Both exist, compare fields
  const allKeys = Array.from(new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)]));

  for (const key of allKeys) {
    const oldValue = oldConfig[key];
    const newValue = newConfig[key];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: prefix + key,
        from: oldValue,
        to: newValue,
      });
    }
  }

  return changes;
}

/**
 * Generate a human-readable summary of configuration changes
 */
export function generateChangeSummary(changes: ConfigChange[], resourceType: 'SERVER' | 'GROUP'): string {
  if (changes.length === 0) {
    return 'No changes detected';
  }

  const changeDescriptions = changes.map(change => {
    if (change.from === undefined) {
      return `${change.field} set to ${formatValue(change.to)}`;
    } else if (change.to === undefined) {
      return `${change.field} removed (was ${formatValue(change.from)})`;
    } else {
      return `${change.field} changed from ${formatValue(change.from)} to ${formatValue(change.to)}`;
    }
  });

  return `${resourceType} changes: ${changeDescriptions.join(', ')}`;
}

/**
 * Format a value for display in change summaries
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    return `"${value}"`;
  }

  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0 ? '{...}' : '{}';
  }

  return String(value);
}