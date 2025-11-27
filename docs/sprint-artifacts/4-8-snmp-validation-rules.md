# SNMP Configuration Validation Rules

**Story:** 4.8 - Fix SNMP Configuration Validation for Existing Servers
**Date:** 2025-11-26
**Status:** Completed

## Overview

This document outlines the validation rules for SNMP configuration in the estatus-web application. The validation ensures data integrity while allowing flexible configuration transitions for existing servers.

## Validation Strategy

The SNMP validation follows a **defense-in-depth** approach:
- **Frontend validation**: Immediate user feedback during form entry
- **Backend validation**: Server-side validation to ensure data integrity
- **Graceful degradation**: Handle missing or partial configurations without breaking

## Backend Validation Rules

### Core Validation Logic

Location: `backend/src/utils/validation.ts:67-112`

#### 1. SNMP Configuration Object Validation

```typescript
if (config.snmpConfig && typeof config.snmpConfig === 'object') {
  // Only validate enabled SNMP configurations
  if (config.snmpConfig.enabled === true) {
    // Validate required and optional fields
  }
}
```

**Key Points:**
- SNMP validation only runs when `snmpConfig` exists and is an object
- Servers without `snmpConfig` property pass validation (existing servers)
- Empty `snmpConfig` objects are treated as disabled
- Only enabled SNMP configurations require field validation

#### 2. Required Fields for Enabled SNMP

| Field | Type | Required When | Validation Rules |
|-------|------|---------------|-----------------|
| `enabled` | boolean | Always | Must be `true` to trigger validation |
| `community` | string | `enabled: true` | Required, non-empty, trimmed string |
| `storageIndexes` | number[] | Optional when enabled | Array of non-negative numbers |
| `disks` | DiskConfig[] | Optional when enabled | Array of disk configuration objects |

#### 3. Field-Specific Validations

##### Community String
- **Required**: Yes, when SNMP is enabled
- **Type**: String
- **Constraints**: Must be non-empty after trimming whitespace
- **Error Message**: "SNMP community string is required when SNMP is enabled"

##### Storage Indexes
- **Required**: No (optional)
- **Type**: Array of numbers
- **Constraints**: All values must be non-negative numbers
- **Error Message**: "All storage indexes must be non-negative numbers"
- **Invalid Array**: "Storage indexes must be an array"

##### Disk Configurations
- **Required**: No (optional)
- **Type**: Array of DiskConfig objects
- **Constraints**: Each disk must have:
  - `index`: Non-negative number
  - `name`: Optional string
- **Error Messages**:
  - "Disk configurations must be an array"
  - "Disk configuration must be an object"
  - "Disk index must be a non-negative number"
  - "Disk name must be a string"

## Frontend Form Validation

### Component: `SNMPConfigSection.tsx`

#### State Management
- **Default Values**:
  - `enabled`: `false` (from `snmpConfig?.enabled || false`)
  - `community`: `'public'` (default community string)
  - `storageIndexes`: Empty string (converted to array)
  - `disks`: Empty array

#### Form Behavior
1. **Disabled State**: All SNMP fields are disabled when SNMP is not enabled
2. **Enabled State**: All fields become editable when SNMP is enabled
3. **Transitions**: Seamless transitions between enabled/disabled states
4. **Validation**: Real-time validation with clear error messages

#### Input Processing
- **Storage Indexes**: Comma-separated string → Array of numbers (filters invalid values)
- **Disk Mappings**: Dynamic array with add/remove functionality
- **Error Handling**: Client-side validation mirrors backend rules

## Configuration State Transitions

### 1. No SNMP → Enable SNMP
```javascript
// Initial state (existing server)
{
  name: "Server-01",
  ip: "192.168.1.10",
  // No snmpConfig property
}

// After enabling SNMP
{
  name: "Server-01",
  ip: "192.168.1.10",
  snmpConfig: {
    enabled: true,
    community: "public",
    storageIndexes: [1, 2, 3],
    disks: []
  }
}
```

### 2. Disable SNMP → Re-enable SNMP
```javascript
// Disabled state preserves configuration
{
  snmpConfig: {
    enabled: false,
    community: "saved-community",
    storageIndexes: [1, 2],
    disks: [{ index: 1, name: "C:" }]
  }
}

// Re-enabling restores previous values
{
  snmpConfig: {
    enabled: true,
    community: "saved-community", // Preserved
    storageIndexes: [1, 2],      // Preserved
    disks: [{ index: 1, name: "C:" }] // Preserved
  }
}
```

### 3. Partial SNMP Configurations
```javascript
// Valid when disabled
{
  snmpConfig: {
    enabled: false,
    community: "public", // Allowed when disabled
    storageIndexes: [1, 2] // Allowed when disabled
  }
}

// Invalid when enabled (missing community)
{
  snmpConfig: {
    enabled: true,
    // community missing - validation error
    storageIndexes: [1, 2]
  }
}
```

## Error Messages

### Validation Error Format
```typescript
interface ValidationErrors {
  [key: string]: string;
}
```

### SNMP-Specific Errors
| Error Key | Message | Condition |
|-----------|---------|-----------|
| `snmpConfig.community` | "SNMP community string is required when SNMP is enabled" | SNMP enabled but community missing/empty |
| `snmpConfig.storageIndexes` | "Storage indexes must be an array" | storageIndexes provided but not array |
| `snmpConfig.storageIndexes` | "All storage indexes must be non-negative numbers" | Array contains invalid values |
| `snmpConfig.disks` | "Disk configurations must be an array" | disks provided but not array |
| `snmpConfig.disks.${index}` | "Disk configuration must be an object" | Disk entry is not object |
| `snmpConfig.disks.${index}.index` | "Disk index must be a non-negative number" | Disk index is invalid |
| `snmpConfig.disks.${index}.name` | "Disk name must be a string" | Disk name is not string |

## Testing Coverage

### Backend Tests
- **Unit Tests**: 21 test cases covering all validation edge cases
- **Integration Tests**: 13 test cases covering real-world scenarios
- **Location**: `backend/src/utils/__tests__/validation.test.ts`

### Frontend Tests
- **Component Tests**: Comprehensive form behavior testing
- **State Transition Tests**: Enable/disable workflows
- **Input Validation Tests**: User input processing and validation
- **Location**: `src/components/config/forms/server/__tests__/SNMPConfigSection.test.tsx`

### Integration Tests
- **Workflow Tests**: End-to-end configuration scenarios
- **Migration Tests**: Existing server data handling
- **Real-world Scenarios**: Typical admin workflows
- **Location**: `backend/src/__tests__/integration/snmp-configuration-workflow.test.ts`

## Implementation Notes

### Key Fixes Applied

1. **Null Safety**: Added proper null checks for `config.snmpConfig`
2. **Type Safety**: Added explicit type annotations to prevent TypeScript errors
3. **Graceful Handling**: Servers without SNMP config now pass validation
4. **Comprehensive Validation**: Enhanced validation for partial configurations
5. **Clear Error Messages**: Specific, actionable error messages for users

### Code Changes

#### Before (Bug)
```typescript
// BUG: Assumes snmpConfig exists when checking enabled
if (config.snmpConfig) {
  if (config.snmpConfig.enabled && !config.snmpConfig.community) {
    errors['snmpConfig.community'] = 'SNMP community string is required when SNMP is enabled';
  }
}
```

#### After (Fixed)
```typescript
// FIXED: Proper type checking and null safety
if (config.snmpConfig && typeof config.snmpConfig === 'object') {
  if (config.snmpConfig.enabled === true) {
    if (!config.snmpConfig.community || typeof config.snmpConfig.community !== 'string' || config.snmpConfig.community.trim() === '') {
      errors['snmpConfig.community'] = 'SNMP community string is required when SNMP is enabled';
    }
    // Additional comprehensive validation...
  }
}
```

## Compatibility

### Backward Compatibility
- ✅ Existing servers without SNMP config continue to work
- ✅ Existing servers with SNMP config unchanged
- ✅ API response format unchanged
- ✅ Database schema unchanged (file-based)

### Frontend Compatibility
- ✅ Form component handles all edge cases
- ✅ Optional chaining prevents runtime errors
- ✅ Default values provide good user experience
- ✅ State management preserves data during transitions

## Security Considerations

### Input Validation
- **Sanitization**: All string inputs are trimmed before validation
- **Type Checking**: Strict type validation prevents injection attacks
- **Range Validation**: Numeric values constrained to valid ranges
- **Defense in Depth**: Frontend and backend validation aligned

### Data Integrity
- **Atomic Operations**: SNMP config changes validated before persistence
- **Rollback Safety**: Invalid configurations rejected entirely
- **Error Handling**: Graceful degradation for partial data

## Performance Impact

### Validation Performance
- **Minimal Overhead**: Validation only runs when SNMP config present
- **Efficient Checks**: Short-circuit evaluation for disabled SNMP
- **Type Safety**: Early type checking prevents runtime errors

### Frontend Performance
- **Lazy Evaluation**: Form validation only on relevant fields
- **State Optimization**: Efficient state updates with proper change detection
- **UI Responsiveness**: Real-time validation without blocking

---

## Summary

The SNMP configuration validation system now properly handles:

1. **Existing servers** without SNMP configuration
2. **Partial configurations** during state transitions
3. **Comprehensive validation** for enabled SNMP
4. **Clear error messages** for user guidance
5. **Robust testing** covering all edge cases

This resolves the bug where users could not add SNMP configuration to existing servers that were created without SNMP settings, enabling monitoring on previously configured servers without recreation.