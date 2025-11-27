# Story 3.8: Implement Dynamic Group Row Layout with Flexible Sizing

Status: ready-for-dev

## Story

As a user managing dashboard groups,
I want to arrange groups in rows with automatic flexible sizing and customizable ordering,
so that I can fit any number of groups in a row and control their display order.

## Acceptance Criteria

1. **Given** I have created groups in the configuration UI
   **When** I view the dashboard
   **Then** groups are arranged in flexible rows instead of a fixed 4×2 grid
   **And** each row automatically adjusts group widths to fit all groups in that row

2. **Given** I want to control group ordering within rows
   **When** I edit a group in the configuration UI
   **Then** I can set a "row order" number that determines the position within the row
   **And** groups are displayed left-to-right in ascending row order

3. **Given** I have 3 groups assigned to row 1
   **When** the dashboard renders
   **Then** each group occupies 33.33% of the row width
   **And** all 3 groups fit perfectly in the row

4. **Given** I have 2 groups assigned to row 1
   **When** the dashboard renders
   **Then** each group occupies 50% of the row width
   **And** both groups fit side-by-side in the row

5. **Given** I have 1 group assigned to row 1
   **When** the dashboard renders
   **Then** the group occupies 100% of the row width
   **And** the group spans the full width

6. **Given** I modify group assignments or row ordering
   **When** I save the changes
   **Then** the dashboard immediately updates to reflect the new layout
   **And** the changes propagate to all connected dashboard clients via SSE

## Tasks / Subtasks

- [x] **Task 1:** Extend GroupConfig data structure (AC: 1, 2)
  - [x] Add `rowNumber` property to GroupConfig interface
  - [x] Add `rowOrder` property to GroupConfig interface
  - [x] Update TypeScript types in frontend and backend

- [x] **Task 2:** Update group configuration form (AC: 2)
  - [x] Add "Row Number" field to GroupForm (number input, default: 1)
  - [x] Add "Row Order" field to GroupForm (number input, default: next available)
  - [x] Add validation for positive integers
  - [x] Update backend validation for new fields

- [x] **Task 3:** Implement dynamic row layout algorithm (AC: 1, 3, 4, 5)
  - [x] Replace fixed 4×2 grid with flexible row-based layout
  - [x] Create `createDynamicRowLayout()` function in layoutUtils.ts
  - [x] Calculate group widths based on count per row (100% / groupCount)
  - [x] Apply CSS Grid with `grid-template-columns: repeat(auto-fit, minmax(minWidth, 1fr))`

- [x] **Task 4:** Update dashboard rendering logic (AC: 1, 3, 4, 5)
  - [x] Modify `Dashboard.tsx` to use new layout algorithm
  - [x] Group servers by `rowNumber` instead of fixed `row` property
  - [x] Sort groups within each row by `rowOrder` ascending
  - [x] Render rows dynamically based on actual group data

- [x] **Task 5:** Enhance ServerContainer for flexible widths (AC: 3, 4, 5)
  - [x] Update `ServerContainer.tsx` to accept dynamic width
  - [x] Remove fixed grid assumptions from server cards
  - [x] Ensure server cards adapt to container width (already supported)

- [x] **Task 6:** Add migration support for existing groups (AC: 1)
  - [x] Update group loading to handle missing `rowNumber`/`rowOrder` (default to row 1, order 1)
  - [x] Ensure backward compatibility with existing group data

- [x] **Task 7:** Implement SSE real-time updates (AC: 6)
  - [x] Extend `groupsChanged` SSE event with new layout data
  - [x] Update dashboard to re-render layout on group changes
  - [x] Test multi-client synchronization (infrastructure already supported)

- [x] **Task 8:** Add comprehensive testing (AC: 1-6)
  - [x] Unit tests for `createDynamicRowLayout()` function
  - [x] Integration tests for group CRUD with new fields
  - [x] Visual tests for different group configurations (1, 2, 3+ groups per row)

## Dev Notes

### Current State Analysis

The existing group management system (Epic 3, Stories 3.1-3.7) implements:
- Fixed 4×2 grid layout (`grid-cols-2 grid-rows-4`)
- Groups with `row` (1-4) and `position` ('left'/'right') properties
- Manual group assignment to specific grid positions

### New Dynamic Layout Requirements

This enhancement introduces:
- **Flexible row sizing**: Groups in same row share width equally
- **Unlimited groups per row**: No more 2-group per row limitation
- **Customizable ordering**: `rowOrder` determines position within row
- **Dynamic row creation**: Rows created based on `rowNumber` values

### Architecture Alignment

This story extends existing Epic 3 patterns:
- Reuses GroupConfig interface (adds new properties)
- Maintains existing backend API endpoints
- Extends SSE `groupsChanged` event format
- Follows established form validation patterns

### Project Structure Notes

**Files to Modify:**
- `src/types/group.ts` - Extend GroupConfig interface
- `src/components/forms/server/GroupForm.tsx` - Add new form fields
- `src/components/Dashboard.tsx` - Replace layout algorithm
- `src/components/ServerContainer.tsx` - Support dynamic widths
- `backend/src/routes/config.ts` - Add validation for new fields
- `backend/src/types/group.ts` - Extend interface

**Files to Create:**
- `src/utils/layoutUtils.ts` - `createDynamicRowLayout()` function
- Tests for new layout algorithm

### Implementation Constraints

- **Backward Compatibility**: Existing groups without new fields default to row 1, order 1
- **Performance**: Layout calculation should complete in <100ms for <50 groups
- **Responsive**: Maintain existing responsive behavior within row constraints
- **Real-time**: Changes propagate via existing SSE infrastructure

### CSS Grid Strategy

Replace fixed grid with dynamic approach:
```css
.old {
  display: grid;
  grid-template-columns: 1fr 1fr;  /* Fixed 2 columns */
  grid-template-rows: repeat(4, 1fr); /* Fixed 4 rows */
}

.new {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(minWidth, 1fr));
  gap: 1rem;
}
```

### References

- [Source: docs/epics.md#epic-3-dashboard-group-management](../epics.md#epic-3-dashboard-group-management)
- [Source: docs/architecture.md#component-architecture](../architecture.md#component-architecture)
- [Source: docs/architecture.md#data-architecture](../architecture.md#data-architecture)
- [Source: src/components/Dashboard.tsx](../../src/components/Dashboard.tsx) - Current layout implementation
- [Source: src/types/group.ts](../../src/types/group.ts) - Current GroupConfig interface

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/stories/3-8-implement-dynamic-group-row-layout-with-flexible-sizing.context.xml

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

### File List