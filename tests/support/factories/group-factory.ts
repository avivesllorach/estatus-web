/**
 * Group Factory for Test Data Generation
 *
 * Generates GroupConfig objects for dashboard layout testing.
 *
 * Usage:
 * const group = createGroup({ name: 'Production', serverIds: ['server-001', 'server-002'] });
 * const groups = createGroups(3);
 */

export interface GroupConfig {
  id: string;
  name: string;
  order: number;
  serverIds: string[];
}

let groupCounter = 1;

/**
 * Reset group counter (useful in beforeEach)
 */
export function resetGroupCounter(): void {
  groupCounter = 1;
}

/**
 * Generate a unique group ID
 */
function generateGroupId(overrideId?: string): string {
  if (overrideId) return overrideId;
  const id = `group-${groupCounter.toString().padStart(3, '0')}`;
  groupCounter++;
  return id;
}

/**
 * Create a GroupConfig object for testing
 *
 * @param overrides - Partial GroupConfig to override defaults
 * @returns Complete GroupConfig object
 */
export function createGroup(overrides?: Partial<GroupConfig>): GroupConfig {
  const id = generateGroupId(overrides?.id);
  const name = overrides?.name || `Test Group ${id}`;

  return {
    id,
    name,
    order: overrides?.order ?? groupCounter - 1,
    serverIds: overrides?.serverIds || [],
  };
}

/**
 * Create multiple GroupConfig objects
 *
 * @param count - Number of groups to create
 * @param overrides - Optional overrides for all groups
 * @returns Array of GroupConfig objects
 */
export function createGroups(count: number, overrides?: Partial<GroupConfig>): GroupConfig[] {
  return Array.from({ length: count }, (_, i) =>
    createGroup({ ...overrides, order: overrides?.order ?? i })
  );
}

/**
 * Create a group with assigned servers
 *
 * @param serverIds - Array of server IDs to assign
 * @param overrides - Optional overrides
 * @returns GroupConfig with servers assigned
 */
export function createGroupWithServers(serverIds: string[], overrides?: Partial<GroupConfig>): GroupConfig {
  return createGroup({
    ...overrides,
    serverIds,
  });
}
