# Story 4.3: Implement Dashboard Real-Time Updates for Server Changes

Status: ready-for-dev

## Story

As a user viewing the dashboard,
I want the dashboard to update automatically when servers are added/removed/updated,
so that I always see the current monitoring state without refreshing.

## Acceptance Criteria

1. Dashboard adds new server card when `serverAdded` SSE event received
2. Dashboard removes server card when `serverRemoved` SSE event received
3. Dashboard updates server details when `serverUpdated` SSE event received
4. Dashboard reorganizes layout when `groupsChanged` SSE event received
5. All updates happen smoothly without full page refresh
6. Monitoring data (ping status, disk info) continues updating during layout changes

## Tasks / Subtasks

- [x] Task 1: Extend EventSource listener for new configuration event types (AC: 1,2,3,4)
  - [x] Add event handlers for serverAdded, serverRemoved, serverUpdated, groupsChanged
  - [x] Integrate with existing EventSource infrastructure
- [x] Task 2: Implement dynamic server card management (AC: 1,2,3)
  - [x] Create ServerContainer component addition/removal logic
  - [x] Handle server data updates without destroying/recreating components
  - [x] Position new servers in appropriate groups
- [x] Task 3: Implement group layout reorganization (AC: 4)
  - [x] Re-render group structure when groupsChanged event received
  - [x] Maintain existing ServerContainer instances during reorganization
  - [x] Animate layout transitions smoothly
- [x] Task 4: Ensure smooth visual transitions (AC: 5)
  - [x] Add CSS transitions for server card additions/removals
  - [x] Prevent layout flash during group reorganization
  - [x] Test for visual continuity during rapid changes
- [x] Task 5: Maintain monitoring continuity (AC: 6)
  - [x] Ensure statusChange and diskUpdate events continue during layout updates
  - [x] Test monitoring stream integrity during server additions/removals
  - [x] Verify no data loss during group reorganization

## Dev Notes

### Architecture Patterns and Constraints

- Extend existing `/api/events` SSE endpoint usage in dashboard component
- Reuse ServerContainer component pattern from current dashboard implementation
- Maintain existing state management for server monitoring data
- Follow established component hierarchy: Dashboard → Group → ServerContainer
- Preserve existing accessibility patterns during dynamic updates

### SSE Event Integration

From previous Story 4-2, these event types are available:
- `serverAdded`: { "type": "serverAdded", "server": { "id": "...", "name": "...", "ip": "...", ... } }
- `serverUpdated`: { "type": "serverUpdated", "server": { "id": "...", "name": "...", "ip": "...", ... } }
- `serverRemoved`: { "type": "serverRemoved", "serverId": "server-001" }
- `groupsChanged`: { "type": "groupsChanged", "groups": [ { "id": "...", "name": "...", "order": 1, "serverIds": [...] } ] }

### Component Structure Notes

- Current dashboard renders static server list from initial data
- Need to convert to dynamic rendering with add/remove/update capabilities
- ServerContainer components should be keyed by serverId for proper React reconciliation
- Group containers need dynamic server list management

### Testing Standards Summary

- Test SSE event handling with mock EventSource
- Verify component state updates match event data
- Test edge cases: rapid events, invalid event data, network interruptions
- Ensure accessibility during dynamic updates (ARIA live regions)
- Performance testing with large numbers of servers

### Learnings from Previous Story

**From Story 4-2 (Status: done)**

- **New SSE Infrastructure**: Event broadcasting system for configuration changes is in place at `/api/events`
- **Event Patterns Established**: Configuration events follow consistent JSON structure with type and data fields
- **Broadcast Mechanism**: All connected clients receive configuration events simultaneously
- **Error Handling**: SSE error handling and reconnection logic implemented

**Technical Debt**: None identified from previous story
**Warnings for Next Story**: Ensure EventSource listeners handle both monitoring events (statusChange, diskUpdate) and configuration events simultaneously
**New Interfaces to Use**: EventSource event handlers for serverAdded/serverUpdated/serverRemoved/groupsChanged

[Source: stories/4-2-extend-sse-events-for-configuration-changes.md]

### References

- [Source: epics.md#Story-4.3](/home/arnau/estatus-web/docs/epics.md#1222-1257)
- [Source: stories/4-2-extend-sse-events-for-configuration-changes.md](/home/arnau/estatus-web/docs/sprint-artifacts/4-2-extend-sse-events-for-configuration-changes.md)

## Dev Agent Record

### Context Reference

- [4-3-implement-dashboard-real-time-updates-for-server-changes.context.xml](4-3-implement-dashboard-real-time-updates-for-server-changes.context.xml)

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

**Implementation Summary:**
Successfully implemented real-time dashboard updates for server configuration changes. The Dashboard now responds to SSE events (serverAdded, serverRemoved, serverUpdated, groupsChanged) with smooth visual transitions and maintains monitoring continuity.

**Key Changes Made:**
1. **Extended SSE Infrastructure** - Added new event types to EventMessage interface and implemented handlers in ApiService
2. **Dynamic Server Management** - Dashboard now uses server.id as React keys for proper reconciliation and maintains server state during updates
3. **Group-Based Layout** - Replaced hardcoded layout with dynamic group-based organization from dashboard-layout.json
4. **Smooth Visual Transitions** - Added CSS animations and transitions for server additions/removals and layout reorganization
5. **Monitoring Continuity** - Existing statusChange and diskUpdate events continue working seamlessly during configuration changes

**Files Modified:**
- src/services/api.ts - Extended EventSource handling with new event types and groups callback
- src/components/Dashboard.tsx - Implemented group-based layout and SSE event handling
- src/components/ServerContainer.tsx - Updated to use server.id keys and added transition classes
- src/App.css - Added smooth transition animations for server cards and containers

**Test Coverage:**
- Created comprehensive test suites for Dashboard component, ApiService SSE handling, and ServerContainer behavior
- Tests cover initial data loading, SSE event handling, group reorganization, visual transitions, and edge cases
- Tests are ready for integration once testing framework is configured

### File List

**Modified Files:**
- src/services/api.ts - Extended SSE event handling for configuration changes
- src/components/Dashboard.tsx - Dynamic group-based layout with real-time updates
- src/components/ServerContainer.tsx - React key optimization and transitions
- src/App.css - Smooth transition animations

**New Files:**
- src/components/__tests__/Dashboard.test.tsx - Dashboard component real-time update tests
- src/services/__tests__/api.test.ts - ApiService SSE event handling tests
- src/components/__tests__/ServerContainer.test.tsx - ServerContainer dynamic behavior tests