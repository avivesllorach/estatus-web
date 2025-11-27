# Story 3.9: Implement Server-Count-Based Proportional Width Distribution

Status: review

## Story

As a user,
I want server groups in the same row to distribute width proportionally based on their server count,
so that groups with more servers get more visual space and groups with fewer servers take up less space.

## Acceptance Criteria

1. **Given** I have multiple groups in the same row on the dashboard
   **When** the dashboard renders
   **Then** each group's width is calculated proportionally based on its server count relative to the total servers in that row

2. **Given** Row 1 contains Group A (4 servers) and Group B (1 server)
   **When** the dashboard renders
   **Then** Group A occupies 80% of the row width and Group B occupies 20% of the row width

3. **Given** a row contains groups with varying server counts
   **When** a server is added to or removed from any group in that row
   **Then** all groups in that row automatically resize to maintain proportional distribution

4. **Given** a group has no servers assigned
   **When** the dashboard renders
   **Then** the group displays a meaningful empty state and takes up minimal proportional width

5. **Given** I am viewing groups on smaller screens
   **When** the row contains many groups
   **Then** proportional sizing respects minimum group width constraints (200px minimum)

## Tasks / Subtasks

- [x] Task 1: Modify layout calculation algorithm (AC: #1, #5)
  - [x] Subtask 1.1: Update `createDynamicRowLayout()` in `layoutUtils.ts` to count servers per group
  - [x] Subtask 1.2: Replace equal width calculation with proportional width based on server count
  - [x] Subtask 1.3: Add minimum width constraints to prevent groups from becoming too small

- [x] Task 2: Update dashboard rendering to use proportional widths (AC: #1, #4)
  - [x] Subtask 2.1: Modify `Dashboard.tsx` grid template columns to use calculated proportional widths
  - [x] Subtask 2.2: Update ServerContainer components to handle variable widths gracefully
  - [x] Subtask 2.3: Add empty state handling for groups with no servers

- [x] Task 3: Ensure responsive behavior and edge cases (AC: #3, #5)
  - [x] Subtask 3.1: Test proportional resizing when servers are added/removed from groups
  - [x] Subtask 3.2: Handle zero-server groups without breaking layout
  - [x] Subtask 3.3: Validate minimum width constraints on different screen sizes

- [x] Task 4: Update existing tests and add new ones (AC: #1, #2, #3)
  - [x] Subtask 4.1: Update existing layout tests to expect proportional distribution
  - [x] Subtask 4.2: Add tests for proportional width calculations with various server count scenarios
  - [x] Subtask 4.3: Add regression tests to ensure existing functionality remains intact

## Dev Notes

### Current Implementation Analysis

The current system uses **equal width distribution**:
- `layoutUtils.ts:96`: `const width = groupCount > 0 ? \`${(100 / groupCount).toFixed(2)}%\` : '100%';`
- `Dashboard.tsx:175`: `gridTemplateColumns: \`repeat(${groupCount}, minmax(200px, 1fr))\``

### Required Changes

**New Proportional Algorithm:**
```typescript
// For each row: calculate total servers, then proportional widths
const totalServersInRow = groupsInRow.reduce((sum, group) => sum + group.serverIds.length, 0);
groupsInRow.forEach(group => {
  const serverCount = group.serverIds.length;
  const proportionalWidth = totalServersInRow > 0 ? (serverCount / totalServersInRow) * 100 : 0;
  group._width = `${Math.max(proportionalWidth, minimumWidthPercent)}%`;
});
```

**CSS Grid Update:**
```typescript
// Replace equal distribution with specific proportional widths
const gridTemplateColumns = groupsInRow.map(group => group._width).join(' ');
```

### Key Files to Modify

- `src/utils/layoutUtils.ts` - Core layout calculation algorithm
- `src/components/Dashboard.tsx` - Grid rendering logic
- `src/components/config/forms/server/` - Group form updates (may need validation)
- `backend/dashboard-layout.json` - Test data with varied server counts

### Edge Cases to Handle

1. **Zero-server groups**: Should display empty state and take minimal proportional width
2. **Single-group rows**: Should take 100% width regardless of server count
3. **Minimum width enforcement**: Ensure groups remain usable on smaller screens
4. **Responsive behavior**: Proportional sizing should work across desktop/tablet views

### Examples

**Before (Equal Distribution):**
- Row 1: Group A (4 servers) + Group B (1 server) = 50% each
- Row 2: Group C (2 servers) + Group D (2 servers) = 50% each

**After (Proportional Distribution):**
- Row 1: Group A (4 servers) + Group B (1 server) = 80% / 20%
- Row 2: Group C (2 servers) + Group D (2 servers) = 50% / 50%

### Project Structure Notes

This enhancement maintains the existing group management API and only affects the visual layout calculation. No backend schema changes are required since `serverIds` arrays are already tracked.

### References

- Current layout algorithm: `src/utils/layoutUtils.ts:95-96`
- Dashboard grid rendering: `src/components/Dashboard.tsx:174-175`
- Group data structure: `src/types/group.ts`
- Test patterns: `src/components/__tests__/Dashboard.dynamic-layout.test.tsx`

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/3-9-implement-server-count-based-proportional-width-distribution.context.xml

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

✅ **Successfully implemented server-count-based proportional width distribution**

**Implementation Summary:**
- Modified `createDynamicRowLayout()` to calculate proportional widths based on server count
- Added minimum width constraints (15% minimum) to ensure usability
- Implemented scaling algorithm when total exceeds 100%
- Updated Dashboard.tsx to use `generateProportionalGridTemplateColumns()`
- Enhanced ServerContainer with meaningful empty states for zero-server groups
- Created comprehensive test suite covering all acceptance criteria

**Key Technical Changes:**
1. **layoutUtils.ts:91-130** - New proportional width algorithm with server count calculation
2. **layoutUtils.ts:167-189** - New `generateProportionalGridTemplateColumns()` function
3. **Dashboard.tsx:170-186** - Updated grid rendering to use proportional widths
4. **Dashboard.tsx:64-76** - Modified to include all groups (including zero-server groups)
5. **ServerContainer.tsx:33-57** - Added empty state handling with helpful messaging
6. **Updated test files** - Comprehensive test coverage for proportional distribution

**Acceptance Criteria Validation:**
- ✅ AC1: Proportional width calculation based on server count
- ✅ AC2: 80/20 split example (4 servers vs 1 server)
- ✅ AC3: Dynamic resizing when servers are added/removed
- ✅ AC4: Empty groups display meaningful empty state with minimum width
- ✅ AC5: Minimum width constraints (200px minimum via CSS minmax)

**Test Data Created:**
- Updated `backend/dashboard-layout.json` with varied server counts for testing
- Test scenarios include: 4/1 server split, 2/2 server split, zero-server groups

**Files Modified:**
- `src/utils/layoutUtils.ts` - Core proportional width algorithm
- `src/components/Dashboard.tsx` - Grid rendering integration
- `src/components/ServerContainer.tsx` - Empty state handling
- `src/components/__tests__/Dashboard.dynamic-layout.test.tsx` - Updated tests
- `src/utils/__tests__/layoutUtils.test.ts` - New proportional width tests
- `backend/dashboard-layout.json` - Test data with varied server counts

### File List

- **src/utils/layoutUtils.ts** - Core layout calculation algorithm with proportional width distribution
- **src/components/Dashboard.tsx** - Updated to use proportional grid template columns
- **src/components/ServerContainer.tsx** - Enhanced with empty state for zero-server groups
- **backend/dashboard-layout.json** - Test data configuration with varied server counts
- **src/components/__tests__/Dashboard.dynamic-layout.test.tsx** - Updated dashboard tests
- **src/utils/__tests__/layoutUtils.test.ts** - Comprehensive proportional width tests