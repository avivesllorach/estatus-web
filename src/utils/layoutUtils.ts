/**
 * Dynamic Row Layout Utilities
 *
 * Implements flexible row-based layout for groups with automatic width distribution.
 * Replaces the fixed 4×2 grid with dynamic rows that can contain any number of groups.
 */

import { GroupConfig } from '@/types/group';

/**
 * Represents a group with layout metadata for rendering
 */
export interface LayoutGroup extends GroupConfig {
  _layoutRow: number;     // The row this group is assigned to
  _layoutOrder: number;   // The position within the row
  _width: string;         // CSS width value (e.g., "33.33%", "50%", "100%")
}

/**
 * Represents a single row containing groups
 */
export interface LayoutRow {
  rowNumber: number;      // Row identifier (1, 2, 3, ...)
  groups: LayoutGroup[];   // Groups in this row, sorted by rowOrder
  width: string;          // Width of each group in this row (all groups in a row share width)
}

/**
 * Dynamic layout result containing all rows and layout metadata
 */
export interface DynamicLayout {
  rows: LayoutRow[];                    // All rows with their groups
  totalRows: number;                    // Total number of rows
  groupsPerRow: number[];               // Array of group counts per row
  maxGroupsPerRow: number;              // Maximum groups in any single row
}

/**
 * Creates a dynamic row layout from group configurations.
 *
 * @param groups - Array of group configurations
 * @param options - Optional configuration for layout behavior
 * @returns DynamicLayout object with row organization and calculated widths
 */
export function createDynamicRowLayout(
  groups: GroupConfig[],
  options: {
    defaultRowNumber?: number;
    defaultRowOrder?: number;
    minWidth?: string;
  } = {}
): DynamicLayout {
  const {
    defaultRowNumber = 1,
    defaultRowOrder = 1
  } = options;

  // Create layout groups with defaults for missing properties
  const layoutGroups: LayoutGroup[] = groups.map((group, index) => ({
    ...group,
    _layoutRow: group.rowNumber ?? defaultRowNumber,
    _layoutOrder: group.rowOrder ?? (index + defaultRowOrder),
    _width: '' // Will be calculated below
  }));

  // Group by row number
  const groupsByRow = new Map<number, LayoutGroup[]>();

  layoutGroups.forEach(group => {
    const rowNumber = group._layoutRow;
    if (!groupsByRow.has(rowNumber)) {
      groupsByRow.set(rowNumber, []);
    }
    groupsByRow.get(rowNumber)!.push(group);
  });

  // Sort groups within each row by rowOrder
  groupsByRow.forEach(groupsInRow => {
    groupsInRow.sort((a, b) => a._layoutOrder - b._layoutOrder);
  });

  // Create layout rows with calculated widths
  const rows: LayoutRow[] = [];
  let maxGroupsPerRow = 0;
  const groupsPerRow: number[] = [];

  // Sort row numbers to maintain consistent order
  const sortedRowNumbers = Array.from(groupsByRow.keys()).sort((a, b) => a - b);

  sortedRowNumbers.forEach(rowNumber => {
    const groupsInRow = groupsByRow.get(rowNumber)!;
    const groupCount = groupsInRow.length;

    // Calculate proportional width for each group based on server count
    const totalServersInRow = groupsInRow.reduce((sum, group) => sum + (group.serverIds?.length || 0), 0);

    // Calculate minimum width percentage based on minWidth constraint
    // Assuming a typical row width, 200px minimum converts to approximately 15-20% minimum
    const minimumWidthPercent = 15; // Conservative minimum to ensure usability

    groupsInRow.forEach(group => {
      const serverCount = group.serverIds?.length || 0;

      let proportionalWidth: number;
      if (totalServersInRow === 0) {
        // All groups have zero servers - distribute equally
        proportionalWidth = 100 / groupCount;
      } else {
        // Calculate proportional width based on server count
        proportionalWidth = (serverCount / totalServersInRow) * 100;
      }

      // Apply minimum width constraint
      const finalWidth = Math.max(proportionalWidth, minimumWidthPercent);

      // Store calculated width for this group
      group._width = `${finalWidth.toFixed(2)}%`;
    });

    // Adjust widths if sum exceeds 100% due to minimum constraints
    const totalWidth = groupsInRow.reduce((sum, group) => sum + parseFloat(group._width), 0);
    if (totalWidth > 100) {
      const scaleDownFactor = 100 / totalWidth;
      groupsInRow.forEach(group => {
        const currentWidth = parseFloat(group._width);
        const adjustedWidth = currentWidth * scaleDownFactor;
        group._width = `${adjustedWidth.toFixed(2)}%`;
      });
    }

    // Create layout row (width property is deprecated but keep for compatibility)
    const layoutRow: LayoutRow = {
      rowNumber,
      groups: groupsInRow,
      width: groupsInRow.length > 0 ? `${(100 / groupsInRow.length).toFixed(2)}%` : '100%'
    };

    rows.push(layoutRow);
    groupsPerRow.push(groupCount);
    maxGroupsPerRow = Math.max(maxGroupsPerRow, groupCount);
  });

  return {
    rows,
    totalRows: rows.length,
    groupsPerRow,
    maxGroupsPerRow
  };
}

/**
 * Generates CSS Grid template columns value for a given number of groups.
 *
 * @param groupCount - Number of groups in a row
 * @param minWidth - Minimum width for each group
 * @returns CSS grid-template-columns value
 */
export function generateGridTemplateColumns(groupCount: number, minWidth: string = '200px'): string {
  if (groupCount === 0) return 'none';
  if (groupCount === 1) return '1fr';

  // Use repeat with auto-fit for flexible layouts
  return `repeat(${groupCount}, minmax(${minWidth}, 1fr))`;
}

/**
 * Generates CSS Grid template columns value using proportional widths.
 *
 * @param groups - Array of LayoutGroup objects with calculated _width properties
 * @param minWidth - Minimum width for each group (fallback constraint)
 * @returns CSS grid-template-columns value using specific proportional widths
 */
export function generateProportionalGridTemplateColumns(groups: LayoutGroup[], minWidth: string = '200px'): string {
  if (groups.length === 0) return 'none';
  if (groups.length === 1) return '1fr';

  // Use the calculated proportional widths from the layout algorithm
  const proportionalWidths = groups.map(group => {
    // Use the calculated width, but ensure it meets minimum width constraint
    const calculatedWidth = group._width || '0%';

    // Convert percentage to fr units by using minmax with the percentage
    // This ensures proportional sizing while maintaining minimum width
    return `minmax(${minWidth}, ${calculatedWidth})`;
  });

  return proportionalWidths.join(' ');
}

/**
 * Calculates the optimal grid CSS classes for a row based on group count.
 *
 * @param groupCount - Number of groups in the row
 * @returns Object with CSS class names for different grid systems
 */
export function calculateRowGridClasses(groupCount: number): {
  tailwind: string;
  cssGrid: string;
  flexbox: string;
} {
  if (groupCount === 0) {
    return {
      tailwind: 'hidden',
      cssGrid: 'display: none',
      flexbox: 'display: none'
    };
  }

  if (groupCount === 1) {
    return {
      tailwind: 'grid grid-cols-1 gap-4',
      cssGrid: 'display: grid; grid-template-columns: 1fr; gap: 1rem;',
      flexbox: 'display: flex; flex-direction: column; width: 100%;'
    };
  }

  if (groupCount === 2) {
    return {
      tailwind: 'grid grid-cols-2 gap-4',
      cssGrid: 'display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;',
      flexbox: 'display: flex; gap: 1rem; width: 100%;'
    };
  }

  if (groupCount === 3) {
    return {
      tailwind: 'grid grid-cols-3 gap-4',
      cssGrid: 'display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;',
      flexbox: 'display: flex; gap: 1rem; width: 100%;'
    };
  }

  // For 4+ groups, use responsive grid
  return {
    tailwind: `grid grid-cols-${Math.min(groupCount, 6)} gap-4`,
    cssGrid: `display: grid; grid-template-columns: repeat(${groupCount}, minmax(200px, 1fr)); gap: 1rem;`,
    flexbox: 'display: flex; flex-wrap: wrap; gap: 1rem; width: 100%;'
  };
}

/**
 * Validates a group configuration for layout compatibility.
 *
 * @param group - Group configuration to validate
 * @returns Validation result with any issues found
 */
export function validateGroupForLayout(group: GroupConfig): {
  isValid: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check for required fields
  if (!group.id || group.id.trim() === '') {
    issues.push('Group ID is required');
  }

  if (!group.name || group.name.trim() === '') {
    issues.push('Group name is required');
  }

  // Check row number validity
  if (group.rowNumber !== undefined) {
    if (typeof group.rowNumber !== 'number' || group.rowNumber < 1) {
      issues.push('Row number must be a positive integer');
    }
    if (group.rowNumber > 50) {
      warnings.push('Row number is very large (>50), consider using smaller numbers');
    }
  }

  // Check row order validity
  if (group.rowOrder !== undefined) {
    if (typeof group.rowOrder !== 'number' || group.rowOrder < 1) {
      issues.push('Row order must be a positive integer');
    }
    if (group.rowOrder > 100) {
      warnings.push('Row order is very large (>100), consider using smaller numbers');
    }
  }

  // Check server IDs
  if (!Array.isArray(group.serverIds)) {
    issues.push('Server IDs must be an array');
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Migration utility to convert legacy row/position to new rowNumber/rowOrder.
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
    }

    if (group.position === 'left') {
      migratedGroup.rowOrder = 1;
    } else if (group.position === 'right') {
      migratedGroup.rowOrder = 2;
    } else {
      migratedGroup.rowOrder = 1; // Default
    }

    return migratedGroup;
  });
}