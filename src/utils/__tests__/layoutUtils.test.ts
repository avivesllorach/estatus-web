/**
 * Layout Utilities Tests
 *
 * Tests for the dynamic row layout algorithm including:
 * - createDynamicRowLayout function
 * - Migration utilities
 * - Validation functions
 * - Edge cases and error handling
 */

import {
  createDynamicRowLayout,
  migrateLegacyGroups,
  validateGroupForLayout,
  calculateRowGridClasses,
  generateGridTemplateColumns,
  LayoutGroup,
  DynamicLayout
} from '../layoutUtils';
import { GroupConfig } from '@/types/group';

describe('createDynamicRowLayout', () => {
  const mockGroups: GroupConfig[] = [
    { id: 'group-1', name: 'Group 1', order: 1, rowNumber: 1, rowOrder: 1, serverIds: ['s1', 's2'] },
    { id: 'group-2', name: 'Group 2', order: 2, rowNumber: 1, rowOrder: 2, serverIds: ['s3'] },
    { id: 'group-3', name: 'Group 3', order: 3, rowNumber: 2, rowOrder: 1, serverIds: ['s4', 's5'] },
    { id: 'group-4', name: 'Group 4', order: 4, rowNumber: 2, rowOrder: 2, serverIds: ['s6'] },
    { id: 'group-5', name: 'Group 5', order: 5, rowNumber: 2, rowOrder: 3, serverIds: ['s7'] },
  ];

  it('should create layout with correct row distribution', () => {
    const layout = createDynamicRowLayout(mockGroups);

    expect(layout.totalRows).toBe(2);
    expect(layout.rows).toHaveLength(2);
    expect(layout.rows[0].rowNumber).toBe(1);
    expect(layout.rows[1].rowNumber).toBe(2);
  });

  it('should sort groups within each row by rowOrder', () => {
    const layout = createDynamicRowLayout(mockGroups);

    // Row 1 should have Group 1 (rowOrder: 1) then Group 2 (rowOrder: 2)
    expect(layout.rows[0].groups).toHaveLength(2);
    expect(layout.rows[0].groups[0].id).toBe('group-1');
    expect(layout.rows[0].groups[1].id).toBe('group-2');

    // Row 2 should have Group 3 (rowOrder: 1), Group 4 (rowOrder: 2), Group 5 (rowOrder: 3)
    expect(layout.rows[1].groups).toHaveLength(3);
    expect(layout.rows[1].groups[0].id).toBe('group-3');
    expect(layout.rows[1].groups[1].id).toBe('group-4');
    expect(layout.rows[1].groups[2].id).toBe('group-5');
  });

  it('should calculate proportional widths based on server count', () => {
    const layout = createDynamicRowLayout(mockGroups);

    // Row 1: Group 1 has 2 servers, Group 2 has 1 server = 2/3 vs 1/3 distribution (66.67% vs 33.33%)
    expect(parseFloat(layout.rows[0].groups[0]._width)).toBeCloseTo(66.67, 1);
    expect(parseFloat(layout.rows[0].groups[1]._width)).toBeCloseTo(33.33, 1);

    // Row 2: Group 3 has 2 servers, Group 4 has 1 server, Group 5 has 1 server = 2/4 vs 1/4 vs 1/4 distribution (50% vs 25% vs 25%)
    expect(parseFloat(layout.rows[1].groups[0]._width)).toBeCloseTo(50.00, 1);
    expect(parseFloat(layout.rows[1].groups[1]._width)).toBeCloseTo(25.00, 1);
    expect(parseFloat(layout.rows[1].groups[2]._width)).toBeCloseTo(25.00, 1);
  });

  it('should handle single group per row correctly', () => {
    const singleGroupPerRow: GroupConfig[] = [
      { id: 'group-1', name: 'Group 1', order: 1, rowNumber: 1, rowOrder: 1, serverIds: ['s1'] },
      { id: 'group-2', name: 'Group 2', order: 2, rowNumber: 2, rowOrder: 1, serverIds: ['s2'] },
    ];

    const layout = createDynamicRowLayout(singleGroupPerRow);

    expect(layout.totalRows).toBe(2);
    expect(layout.rows[0].width).toBe('100.00%');
    expect(layout.rows[1].width).toBe('100.00%');
  });

  it('should handle empty groups array', () => {
    const layout = createDynamicRowLayout([]);

    expect(layout.totalRows).toBe(0);
    expect(layout.rows).toHaveLength(0);
    expect(layout.maxGroupsPerRow).toBe(0);
    expect(layout.groupsPerRow).toEqual([]);
  });

  it('should apply default values for missing properties', () => {
    const groupsWithoutNewProps: GroupConfig[] = [
      { id: 'group-1', name: 'Group 1', order: 1, serverIds: ['s1'] },
      { id: 'group-2', name: 'Group 2', order: 2, serverIds: ['s2'] },
    ];

    const layout = createDynamicRowLayout(groupsWithoutNewProps);

    // Should default to row 1, order 1, and order 2 respectively
    expect(layout.rows[0].groups[0]._layoutRow).toBe(1);
    expect(layout.rows[0].groups[0]._layoutOrder).toBe(1);
    expect(layout.rows[0].groups[1]._layoutRow).toBe(1);
    expect(layout.rows[0].groups[1]._layoutOrder).toBe(2);
  });

  it('should calculate correct statistics', () => {
    const layout = createDynamicRowLayout(mockGroups);

    expect(layout.maxGroupsPerRow).toBe(3);
    expect(layout.groupsPerRow).toEqual([2, 3]);
  });
});

describe('migrateLegacyGroups', () => {
  it('should migrate legacy row/position to new rowNumber/rowOrder', () => {
    const legacyGroups: GroupConfig[] = [
      { id: 'group-1', name: 'Group 1', order: 1, row: 1, position: 'left', serverIds: ['s1'] },
      { id: 'group-2', name: 'Group 2', order: 2, row: 1, position: 'right', serverIds: ['s2'] },
      { id: 'group-3', name: 'Group 3', order: 3, row: 2, position: 'left', serverIds: ['s3'] },
    ];

    const migrated = migrateLegacyGroups(legacyGroups);

    expect(migrated[0].rowNumber).toBe(1);
    expect(migrated[0].rowOrder).toBe(1);
    expect(migrated[1].rowNumber).toBe(1);
    expect(migrated[1].rowOrder).toBe(2);
    expect(migrated[2].rowNumber).toBe(2);
    expect(migrated[2].rowOrder).toBe(1);
  });

  it('should not modify groups that already have new properties', () => {
    const modernGroups: GroupConfig[] = [
      { id: 'group-1', name: 'Group 1', order: 1, rowNumber: 3, rowOrder: 2, serverIds: ['s1'] },
    ];

    const migrated = migrateLegacyGroups(modernGroups);

    expect(migrated[0].rowNumber).toBe(3);
    expect(migrated[0].rowOrder).toBe(2);
  });

  it('should apply default values when legacy properties are missing', () => {
    const partialLegacyGroups: GroupConfig[] = [
      { id: 'group-1', name: 'Group 1', order: 1, serverIds: ['s1'] },
    ];

    const migrated = migrateLegacyGroups(partialLegacyGroups);

    expect(migrated[0].rowNumber).toBe(1);
    expect(migrated[0].rowOrder).toBe(1);
  });
});

describe('validateGroupForLayout', () => {
  it('should validate correct group configuration', () => {
    const validGroup: GroupConfig = {
      id: 'group-1',
      name: 'Test Group',
      order: 1,
      rowNumber: 1,
      rowOrder: 1,
      serverIds: ['s1', 's2']
    };

    const result = validateGroupForLayout(validGroup);

    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should detect missing required fields', () => {
    const invalidGroup = {
      id: '',
      name: '',
      order: 0,
      serverIds: []
    } as GroupConfig;

    const result = validateGroupForLayout(invalidGroup);

    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('Group ID is required');
    expect(result.issues).toContain('Group name is required');
  });

  it('should validate rowNumber and rowOrder ranges', () => {
    const invalidGroup: GroupConfig = {
      id: 'group-1',
      name: 'Test Group',
      order: 1,
      rowNumber: 0, // Invalid: must be >= 1
      rowOrder: 101, // Invalid: must be <= 100
      serverIds: ['s1']
    };

    const result = validateGroupForLayout(invalidGroup);

    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('Row number must be a positive integer');
    expect(result.issues).toContain('Row order must be a number between 1 and 100');
  });

  it('should generate warnings for large values', () => {
    const warningGroup: GroupConfig = {
      id: 'group-1',
      name: 'Test Group',
      order: 1,
      rowNumber: 75, // Should generate warning
      rowOrder: 150, // Should generate warning
      serverIds: ['s1']
    };

    const result = validateGroupForLayout(warningGroup);

    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('calculateRowGridClasses', () => {
  it('should return correct CSS classes for different group counts', () => {
    const oneGroup = calculateRowGridClasses(1);
    expect(oneGroup.tailwind).toBe('grid grid-cols-1 gap-4');
    expect(oneGroup.cssGrid).toBe('display: grid; grid-template-columns: 1fr; gap: 1rem;');

    const twoGroups = calculateRowGridClasses(2);
    expect(twoGroups.tailwind).toBe('grid grid-cols-2 gap-4');
    expect(twoGroups.cssGrid).toBe('display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;');

    const threeGroups = calculateRowGridClasses(3);
    expect(threeGroups.tailwind).toBe('grid grid-cols-3 gap-4');
    expect(threeGroups.cssGrid).toBe('display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;');

    const manyGroups = calculateRowGridClasses(5);
    expect(manyGroups.tailwind).toBe('grid grid-cols-5 gap-4');
  });

  it('should handle zero groups', () => {
    const noGroups = calculateRowGridClasses(0);
    expect(noGroups.tailwind).toBe('hidden');
    expect(noGroups.cssGrid).toBe('display: none');
  });
});

describe('generateGridTemplateColumns', () => {
  it('should generate correct CSS for different group counts', () => {
    expect(generateGridTemplateColumns(1)).toBe('1fr');
    expect(generateGridTemplateColumns(2)).toBe('repeat(2, minmax(200px, 1fr))');
    expect(generateGridTemplateColumns(3)).toBe('repeat(3, minmax(200px, 1fr))');
  });

  it('should use custom min width', () => {
    const result = generateGridTemplateColumns(2, '250px');
    expect(result).toBe('repeat(2, minmax(250px, 1fr))');
  });

  it('should handle zero groups', () => {
    expect(generateGridTemplateColumns(0)).toBe('none');
  });
});

describe('proportional width distribution specific tests', () => {
  it('should handle the 80/20 example from acceptance criteria', () => {
    const groups = [
      { id: 'group-a', name: 'Group A', order: 1, rowNumber: 1, rowOrder: 1, serverIds: ['s1', 's2', 's3', 's4'] },
      { id: 'group-b', name: 'Group B', order: 2, rowNumber: 1, rowOrder: 2, serverIds: ['s5'] }
    ];

    const layout = createDynamicRowLayout(groups);

    expect(parseFloat(layout.rows[0].groups[0]._width)).toBeCloseTo(80, 0);
    expect(parseFloat(layout.rows[0].groups[1]._width)).toBeCloseTo(20, 0);
  });

  it('should apply minimum width constraints for very small groups', () => {
    const groups = [
      { id: 'group-1', name: 'Large Group', order: 1, rowNumber: 1, rowOrder: 1, serverIds: Array.from({length: 20}, (_, i) => `s${i}`) },
      { id: 'group-2', name: 'Tiny Group', order: 2, rowNumber: 1, rowOrder: 2, serverIds: ['s20'] },
      { id: 'group-3', name: 'Another Tiny Group', order: 3, rowNumber: 1, rowOrder: 3, serverIds: ['s21'] }
    ];

    const layout = createDynamicRowLayout(groups);

    // Tiny groups should get at least 15% minimum width
    expect(parseFloat(layout.rows[0].groups[1]._width)).toBeGreaterThanOrEqual(15);
    expect(parseFloat(layout.rows[0].groups[2]._width)).toBeGreaterThanOrEqual(15);

    // Total should be scaled to exactly 100%
    const totalWidth = layout.rows[0].groups.reduce((sum, group) => sum + parseFloat(group._width), 0);
    expect(totalWidth).toBeCloseTo(100, 1);
  });

  it('should handle groups with zero servers', () => {
    const groups = [
      { id: 'group-1', name: 'Populated Group', order: 1, rowNumber: 1, rowOrder: 1, serverIds: ['s1', 's2', 's3'] },
      { id: 'group-2', name: 'Empty Group', order: 2, rowNumber: 1, rowOrder: 2, serverIds: [] }
    ];

    const layout = createDynamicRowLayout(groups);

    // Populated group gets majority, empty group gets minimum 15%
    expect(parseFloat(layout.rows[0].groups[0]._width)).toBeGreaterThan(15);
    expect(parseFloat(layout.rows[0].groups[1]._width)).toBeGreaterThanOrEqual(15);

    // Total should be exactly 100%
    const totalWidth = parseFloat(layout.rows[0].groups[0]._width) + parseFloat(layout.rows[0].groups[1]._width);
    expect(totalWidth).toBeCloseTo(100, 1);
  });

  it('should distribute equally when all groups have zero servers', () => {
    const groups = [
      { id: 'group-1', name: 'Empty Group 1', order: 1, rowNumber: 1, rowOrder: 1, serverIds: [] },
      { id: 'group-2', name: 'Empty Group 2', order: 2, rowNumber: 1, rowOrder: 2, serverIds: [] },
      { id: 'group-3', name: 'Empty Group 3', order: 3, rowNumber: 1, rowOrder: 3, serverIds: [] }
    ];

    const layout = createDynamicRowLayout(groups);

    // All should get equal distribution (33.33% each)
    layout.rows[0].groups.forEach(group => {
      expect(parseFloat(group._width)).toBeCloseTo(33.33, 1);
    });
  });

  it('should handle single groups with 100% width regardless of server count', () => {
    const singleGroups = [
      { id: 'group-1', name: 'Single Group No Servers', order: 1, rowNumber: 1, rowOrder: 1, serverIds: [] },
      { id: 'group-2', name: 'Single Group Many Servers', order: 2, rowNumber: 2, rowOrder: 1, serverIds: ['s1', 's2', 's3', 's4', 's5'] }
    ];

    const layout = createDynamicRowLayout(singleGroups);

    expect(layout.rows[0].groups[0]._width).toBe('100.00%');
    expect(layout.rows[1].groups[0]._width).toBe('100.00%');
  });
});

describe('generateProportionalGridTemplateColumns', () => {
  it('should generate CSS grid template with proportional widths', () => {
    const groups: LayoutGroup[] = [
      { id: 'group-1', name: 'Group A', serverIds: ['s1', 's2'], order: 1, _layoutRow: 1, _layoutOrder: 1, _width: '66.67%' },
      { id: 'group-2', name: 'Group B', serverIds: ['s3'], order: 2, _layoutRow: 1, _layoutOrder: 2, _width: '33.33%' }
    ];

    const gridTemplate = generateProportionalGridTemplateColumns(groups);
    expect(gridTemplate).toBe('minmax(200px, 66.67%) minmax(200px, 33.33%)');
  });

  it('should handle single group with 1fr', () => {
    const groups: LayoutGroup[] = [
      { id: 'group-1', name: 'Single Group', serverIds: ['s1'], order: 1, _layoutRow: 1, _layoutOrder: 1, _width: '100.00%' }
    ];

    const gridTemplate = generateProportionalGridTemplateColumns(groups);
    expect(gridTemplate).toBe('1fr');
  });

  it('should handle empty groups array', () => {
    const gridTemplate = generateProportionalGridTemplateColumns([]);
    expect(gridTemplate).toBe('none');
  });

  it('should use custom minimum width', () => {
    const groups: LayoutGroup[] = [
      { id: 'group-1', name: 'Group A', serverIds: ['s1'], order: 1, _layoutRow: 1, _layoutOrder: 1, _width: '50.00%' },
      { id: 'group-2', name: 'Group B', serverIds: ['s2'], order: 2, _layoutRow: 1, _layoutOrder: 2, _width: '50.00%' }
    ];

    const gridTemplate = generateProportionalGridTemplateColumns(groups, '300px');
    expect(gridTemplate).toBe('minmax(300px, 50.00%) minmax(300px, 50.00%)');
  });
});

describe('edge cases', () => {
  it('should handle groups with same rowNumber and rowOrder', () => {
    const duplicateOrder: GroupConfig[] = [
      { id: 'group-1', name: 'Group 1', order: 1, rowNumber: 1, rowOrder: 1, serverIds: ['s1'] },
      { id: 'group-2', name: 'Group 2', order: 2, rowNumber: 1, rowOrder: 1, serverIds: ['s2'] },
    ];

    const layout = createDynamicRowLayout(duplicateOrder);

    expect(layout.rows[0].groups).toHaveLength(2);
    // Both should have 50% width since there are 2 groups
    expect(layout.rows[0].groups[0]._width).toBe('50.00%');
    expect(layout.rows[0].groups[1]._width).toBe('50.00%');
  });

  it('should handle non-consecutive row numbers', () => {
    const skipRows: GroupConfig[] = [
      { id: 'group-1', name: 'Group 1', order: 1, rowNumber: 1, rowOrder: 1, serverIds: ['s1'] },
      { id: 'group-2', name: 'Group 2', order: 2, rowNumber: 5, rowOrder: 1, serverIds: ['s2'] },
      { id: 'group-3', name: 'Group 3', order: 3, rowNumber: 10, rowOrder: 1, serverIds: ['s3'] },
    ];

    const layout = createDynamicRowLayout(skipRows);

    expect(layout.totalRows).toBe(3);
    expect(layout.rows[0].rowNumber).toBe(1);
    expect(layout.rows[1].rowNumber).toBe(5);
    expect(layout.rows[2].rowNumber).toBe(10);
  });

  it('should handle mixed legacy and modern group configurations', () => {
    const mixedGroups: GroupConfig[] = [
      // Legacy format
      { id: 'group-1', name: 'Group 1', order: 1, row: 1, position: 'left', serverIds: ['s1'] },
      // Modern format
      { id: 'group-2', name: 'Group 2', order: 2, rowNumber: 1, rowOrder: 2, serverIds: ['s2'] },
      // No layout info
      { id: 'group-3', name: 'Group 3', order: 3, serverIds: ['s3'] },
    ];

    const layout = createDynamicRowLayout(mixedGroups);

    expect(layout.rows[0].groups).toHaveLength(3);
    expect(layout.rows[0].groups[0]._layoutRow).toBe(1); // Legacy -> row 1
    expect(layout.rows[0].groups[0]._layoutOrder).toBe(1); // Legacy left -> order 1
    expect(layout.rows[0].groups[1]._layoutRow).toBe(1); // Modern -> row 1
    expect(layout.rows[0].groups[1]._layoutOrder).toBe(2); // Modern -> order 2
    expect(layout.rows[0].groups[2]._layoutRow).toBe(1); // Default -> row 1
    expect(layout.rows[0].groups[2]._layoutOrder).toBe(3); // Default -> order 3 (since 1 and 2 are taken)
  });
});