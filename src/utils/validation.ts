/**
 * Validation utility functions for server configuration forms
 */

import { ServerConfig } from '@/types/server'

export interface ValidationResult {
  isValid: boolean
  error: string | null
}

/**
 * Validate required field (not empty, not just whitespace)
 */
export function validateRequired(value: string | undefined | null, fieldName: string = "This field"): string | null {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`
  }
  return null
}

/**
 * Validate IPv4 address format
 * Pattern: xxx.xxx.xxx.xxx (each octet 0-255)
 */
export function validateIPv4(ip: string): string | null {
  if (!ip) {
    return "IP address is required"
  }

  const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
  if (!ipv4Regex.test(ip)) {
    return "Invalid IPv4 format (expected: xxx.xxx.xxx.xxx)"
  }

  // Additional check: each octet must be 0-255
  const octets = ip.split('.').map(Number)
  if (octets.some(octet => octet > 255)) {
    return "Invalid IPv4 format (octets must be 0-255)"
  }

  return null
}

/**
 * Check if server ID already exists in server list
 */
export function checkDuplicateServerId(
  id: string,
  servers: ServerConfig[],
  currentServerId?: string
): string | null {
  if (!id) {
    return "Server ID is required"
  }

  // Skip check if editing current server (allow same ID)
  if (currentServerId && id === currentServerId) {
    return null
  }

  const exists = servers.some(server => server.id === id)
  if (exists) {
    return `Server ID '${id}' already exists`
  }

  return null
}

/**
 * Validate server name (required, length constraints)
 */
export function validateServerName(name: string): string | null {
  if (!name || name.trim() === '') {
    return "Server name is required"
  }

  if (name.length > 50) {
    return "Server name must be 50 characters or less"
  }

  return null
}

/**
 * Validate DNS address (required, basic format check)
 */
export function validateDNS(dns: string): string | null {
  if (!dns || dns.trim() === '') {
    return "DNS address is required"
  }

  if (dns.length > 100) {
    return "DNS address must be 100 characters or less"
  }

  return null
}
