/**
 * Server configuration validation utilities
 *
 * Implements defense-in-depth validation (AD#8):
 * - Backend re-validates all frontend validations
 * - Prevents malicious clients from bypassing validation
 */

export interface ValidationErrors {
  [key: string]: string;
}

/**
 * Validate server configuration
 *
 * @param config - Server configuration object to validate
 * @returns ValidationErrors object if invalid, null if valid
 */
export function validateServerConfig(config: any): ValidationErrors | null {
  const errors: ValidationErrors = {};

  // Required fields
  if (!config.name || typeof config.name !== 'string' || config.name.trim() === '') {
    errors.name = 'Server name is required';
  }

  if (!config.ip || typeof config.ip !== 'string' || config.ip.trim() === '') {
    errors.ip = 'IP address is required';
  }

  // Accept both dns and dnsAddress for compatibility with frontend transformation
  const dnsAddress = config.dnsAddress || config.dns;
  if (!dnsAddress || typeof dnsAddress !== 'string' || dnsAddress.trim() === '') {
    errors.dnsAddress = 'DNS address is required';
  }

  // IP format validation
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (config.ip && !ipRegex.test(config.ip)) {
    errors.ip = 'Invalid IPv4 format (expected: xxx.xxx.xxx.xxx)';
  }

  // Name length
  if (config.name && config.name.length > 50) {
    errors.name = 'Server name must be 50 characters or less';
  }

  // DNS length
  if (config.dnsAddress && config.dnsAddress.length > 100) {
    errors.dnsAddress = 'DNS address must be 100 characters or less';
  }

  // Numeric ranges: consecutiveSuccesses
  if (config.consecutiveSuccesses !== undefined) {
    const val = Number(config.consecutiveSuccesses);
    if (isNaN(val) || val < 1 || val > 10) {
      errors.consecutiveSuccesses = 'Must be a number between 1 and 10';
    }
  }

  // Numeric ranges: consecutiveFailures
  if (config.consecutiveFailures !== undefined) {
    const val = Number(config.consecutiveFailures);
    if (isNaN(val) || val < 1 || val > 10) {
      errors.consecutiveFailures = 'Must be a number between 1 and 10';
    }
  }

  // SNMP configuration validation (if present)
  if (config.snmpConfig && typeof config.snmpConfig === 'object') {
    // Only validate enabled SNMP configurations
    if (config.snmpConfig.enabled === true) {
      // Community string is required when SNMP is enabled
      if (!config.snmpConfig.community || typeof config.snmpConfig.community !== 'string' || config.snmpConfig.community.trim() === '') {
        errors['snmpConfig.community'] = 'SNMP community string is required when SNMP is enabled';
      }

      // storageIndexes must be an array if provided
      if (config.snmpConfig.storageIndexes !== undefined) {
        if (!Array.isArray(config.snmpConfig.storageIndexes)) {
          errors['snmpConfig.storageIndexes'] = 'Storage indexes must be an array';
        } else {
          // Validate that all storage indexes are numbers
          const invalidIndexes = config.snmpConfig.storageIndexes.filter((index: number) =>
            typeof index !== 'number' || isNaN(index) || index < 0
          );
          if (invalidIndexes.length > 0) {
            errors['snmpConfig.storageIndexes'] = 'All storage indexes must be non-negative numbers';
          }
        }
      }

      // disks must be an array if provided (new format)
      if (config.snmpConfig.disks !== undefined) {
        if (!Array.isArray(config.snmpConfig.disks)) {
          errors['snmpConfig.disks'] = 'Disk configurations must be an array';
        } else {
          // Validate each disk configuration
          config.snmpConfig.disks.forEach((disk: any, diskIndex: number) => {
            if (typeof disk !== 'object' || disk === null) {
              errors[`snmpConfig.disks.${diskIndex}`] = 'Disk configuration must be an object';
            } else {
              if (typeof disk.index !== 'number' || isNaN(disk.index) || disk.index < 0) {
                errors[`snmpConfig.disks.${diskIndex}.index`] = 'Disk index must be a non-negative number';
              }
              if (disk.name !== undefined && typeof disk.name !== 'string') {
                errors[`snmpConfig.disks.${diskIndex}.name`] = 'Disk name must be a string';
              }
            }
          });
        }
      }

      // diskNames must be an array if provided (legacy format)
      if (config.snmpConfig.diskNames !== undefined) {
        if (!Array.isArray(config.snmpConfig.diskNames)) {
          errors['snmpConfig.diskNames'] = 'Disk names must be an array';
        } else {
          // Validate that all disk names are strings
          const invalidNames = config.snmpConfig.diskNames.filter((name: any) =>
            typeof name !== 'string'
          );
          if (invalidNames.length > 0) {
            errors['snmpConfig.diskNames'] = 'All disk names must be strings';
          }
        }
      }
    }
  }

  // NetApp configuration validation (if enabled)
  if (config.netappConfig) {
    if (config.netappConfig.enabled) {
      if (!config.netappConfig.apiType || !['rest', 'zapi'].includes(config.netappConfig.apiType)) {
        errors['netappConfig.apiType'] = 'API type must be "rest" or "zapi"';
      }

      if (!config.netappConfig.username) {
        errors['netappConfig.username'] = 'NetApp username is required when NetApp is enabled';
      }

      if (!config.netappConfig.password) {
        errors['netappConfig.password'] = 'NetApp password is required when NetApp is enabled';
      }

      if (config.netappConfig.luns && !Array.isArray(config.netappConfig.luns)) {
        errors['netappConfig.luns'] = 'LUNs must be an array';
      }
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Validate IP address format
 *
 * @param ip - IP address string
 * @returns true if valid IPv4 format, false otherwise
 */
export function validateIP(ip: string): boolean {
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  return ipRegex.test(ip);
}

/**
 * Validate group configuration
 *
 * @param config - Group configuration object to validate
 * @returns ValidationErrors object if invalid, null if valid
 */
export function validateGroupConfig(config: any): ValidationErrors | null {
  const errors: ValidationErrors = {};

  // Required fields
  if (!config.name || typeof config.name !== 'string' || config.name.trim() === '') {
    errors.name = 'Group name is required';
  }

  if (!config.order || typeof config.order !== 'number') {
    errors.order = 'Display order is required';
  }

  if (!config.serverIds || !Array.isArray(config.serverIds)) {
    errors.serverIds = 'Server IDs must be an array';
  }

  // Name validation
  if (config.name) {
    const trimmedName = config.name.trim();
    if (trimmedName.length > 50) {
      errors.name = 'Group name must be 50 characters or less';
    }
    // Check for valid characters (letters, numbers, spaces, hyphens, underscores, and accented characters)
    // Allow Unicode letters, numbers, spaces, hyphens, underscores, periods, and common punctuation
    if (!/^[a-zA-Z0-9\s\-_.()[\]{}À-ÖØ-öø-ÿ]+$/u.test(trimmedName)) {
      errors.name = 'Group name contains invalid characters';
    }
  }

  // Order validation
  if (config.order) {
    const order = Number(config.order);
    if (isNaN(order) || order < 1 || order > 100) {
      errors.order = 'Display order must be a number between 1 and 100';
    }
  }

  // Server IDs validation
  if (config.serverIds && Array.isArray(config.serverIds)) {
    // Check for duplicate server IDs
    const uniqueIds = new Set(config.serverIds);
    if (uniqueIds.size !== config.serverIds.length) {
      errors.serverIds = 'Duplicate server IDs are not allowed';
    }

    // Check for invalid server ID formats
    for (const serverId of config.serverIds) {
      if (typeof serverId !== 'string' || serverId.trim() === '') {
        errors.serverIds = 'All server IDs must be non-empty strings';
        break;
      }
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Sanitize string input (basic XSS prevention)
 *
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}
