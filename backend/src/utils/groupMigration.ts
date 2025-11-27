/**
 * Group Migration Utilities
 *
 * Handles migration from legacy row/position format to new rowNumber/rowOrder format.
 * Ensures backward compatibility with existing group configurations.
 */

import { GroupConfig } from '../routes/config';

/**
 * Migration utility to convert legacy row/position to new rowNumber/rowOrder.
 * This function mirrors the frontend migration to ensure consistency.
 *
 * @param legacyGroups - Groups with legacy row/position properties
 * @returns Groups with new rowNumber/rowOrder properties
 */
export function migrateLegacyGroups(legacyGroups: GroupConfig[]): GroupConfig[] {
  return legacyGroups.map(group => {
    // If group already has new properties, return as-is
    if (group.rowNumber !== undefined && group.rowOrder !== undefined) {
      return group;
    }

    // Migrate from legacy format
    const migratedGroup = { ...group };

    if (group.row !== undefined) {
      migratedGroup.rowNumber = group.row;
    } else {
      // Default to row 1 if no row information exists
      migratedGroup.rowNumber = 1;
    }

    if (group.position === 'left') {
      migratedGroup.rowOrder = 1;
    } else if (group.position === 'right') {
      migratedGroup.rowOrder = 2;
    } else {
      // Default to order 1 if no position information exists
      migratedGroup.rowOrder = 1;
    }

    return migratedGroup;
  });
}

/**
 * Applies migration and writes updated groups back to the layout file.
 * This should be called when groups are loaded to ensure they have the latest format.
 *
 * @param groups - Groups to migrate and save
 * @param layoutPath - Path to the dashboard-layout.json file
 */
export async function migrateAndUpdateGroups(
  groups: GroupConfig[],
  layoutPath: string
): Promise<GroupConfig[]> {
  const migratedGroups = migrateLegacyGroups(groups);

  // Check if migration changed anything
  const hasChanges = groups.some((group, index) => {
    const migrated = migratedGroups[index];
    return (
      group.rowNumber !== migrated.rowNumber ||
      group.rowOrder !== migrated.rowOrder
    );
  });

  if (hasChanges) {
    // Import here to avoid circular dependencies
    const { writeConfigAtomic } = require('./fileUtils');
    const fs = require('fs/promises');

    // Read current layout
    const fileContent = await fs.readFile(layoutPath, 'utf-8');
    const layout = JSON.parse(fileContent);

    // Update groups with migrated data
    layout.groups = migratedGroups;

    // Write back atomically
    await writeConfigAtomic(layoutPath, layout);
  }

  return migratedGroups;
}

/**
 * Validates that all groups have required new properties.
 * Returns groups that need migration.
 *
 * @param groups - Groups to validate
 * @returns Array of groups that need migration
 */
export function findGroupsNeedingMigration(groups: GroupConfig[]): GroupConfig[] {
  return groups.filter(group =>
    group.rowNumber === undefined ||
    group.rowOrder === undefined
  );
}