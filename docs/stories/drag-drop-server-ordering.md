# User Story: Drag-Drop Server Ordering

**Story ID**: SRV-001
**Epic**: Enhanced Group Management
**Status**: Draft
**Priority**: High

## User Story

As a system administrator, I want to reorder servers within a group using drag-and-drop functionality, so that I can control the display order of servers to match my operational preferences.

## Acceptance Criteria

**AC1**: When viewing a group in the management interface, servers are displayed in their current order with clear visual indicators that they can be reordered.

**AC2**: Users can drag individual server items and drop them at different positions within the server list to reorder them.

**AC3**: The drag-and-drop operation provides visual feedback during the dragging process, showing where the item will be placed.

**AC4**: When a server is reordered, the new order is immediately saved to the backend configuration (`dashboard-layout.json`).

**AC5**: The dashboard view reflects the new server order immediately after reordering.

**AC6**: Server ordering is persistent across page refreshes and browser sessions.

## Technical Requirements

### Frontend Changes
- Update `GroupForm.tsx` to include drag-and-drop functionality
- Add visual indicators (drag handles, hover states)
- Implement reorder logic using HTML5 drag and drop API or a library like `react-beautiful-dnd`
- Provide immediate visual feedback during drag operations

### Backend Changes
- Ensure the existing API endpoints properly handle updates to the `serverIds` array order
- No new endpoints needed - will use existing group update functionality

### Dependencies
- Consider installing `react-beautiful-dnd` or `@dnd-kit/core` for robust drag-and-drop functionality
- Alternatively, implement using native HTML5 drag and drop API

## Definition of Done

- [ ] Servers in group management interface can be reordered via drag-and-drop
- [ ] Visual feedback is provided during drag operations
- [ ] New server order persists to `backend/dashboard-layout.json`
- [ ] Dashboard immediately reflects the updated order
- [ ] All existing functionality remains intact
- [ ] No console errors during drag operations
- [ ] Feature works on modern browsers (Chrome, Firefox, Safari, Edge)

## Technical Notes

The system already stores server order in the `serverIds` array of each group in `backend/dashboard-layout.json`. This feature will provide a user-friendly interface to modify that array order through direct manipulation rather than manual editing.

Current data structure:
```json
{
  "groups": [
    {
      "id": "group-1",
      "name": "ARAGÓ",
      "serverIds": ["server-001", "server-002", "server-003"],
      "rowNumber": 1,
      "rowOrder": 1
    }
  ]
}
```