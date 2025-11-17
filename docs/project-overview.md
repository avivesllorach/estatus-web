# Project Overview - Estatus Web

## Executive Summary

**Estatus Web** is a real-time server monitoring dashboard application that provides visual status tracking and disk space monitoring for network infrastructure. Built as a multi-part TypeScript application, it combines a React frontend with an Express backend to deliver live server health updates via Server-Sent Events (SSE).

**Author:** Arnau Vives Llorach

**License:** MIT

---

## Project Purpose

Monitor the availability and disk usage of multiple servers in real-time through an intuitive visual dashboard. The application supports:

- **Ping-based availability monitoring** - ICMP echo requests to detect online/offline status
- **SNMP disk monitoring** - Query Windows/Linux disk usage via SNMP v2c
- **NetApp storage monitoring** - Integration with NetApp REST/ZAPI for LUN monitoring
- **Real-time updates** - Server-Sent Events push changes to connected clients
- **Audio notifications** - Sound alerts when servers change status
- **Visual organization** - Servers grouped by logical categories (ARAGÓ, PROVENÇA, VIRTUAL CAMPUS, etc.)

---

## Project Classification

### Repository Type
**Multi-part** - Frontend and backend in single repository with separate build processes

### Technology Stack

| Component | Technologies |
|-----------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | Express, TypeScript, Node.js |
| **Build Tools** | Vite (frontend), TSC (backend) |
| **Monitoring** | ping, net-snmp, custom NetApp integration |
| **Styling** | Tailwind CSS with custom Aller fonts |
| **Real-time** | Server-Sent Events (SSE) |

### Architecture Type

**Client-Server with Real-Time Push**

```
React SPA ← REST + SSE → Express API → ICMP/SNMP/NetApp → Servers
```

---

## Project Structure

### Parts

**Part 1: Frontend (Web Application)**
- **Location:** Root directory (`/`)
- **Type:** React Single Page Application (SPA)
- **Entry Point:** `src/main.tsx`
- **Build Tool:** Vite
- **Dev Server:** http://localhost:5173

**Part 2: Backend (API Server)**
- **Location:** `backend/` subdirectory
- **Type:** Express REST API + SSE server
- **Entry Point:** `backend/src/server.ts`
- **Build Tool:** TypeScript Compiler (tsc)
- **Server:** http://localhost:3001

### Key Directories

```
/                      # Frontend root
├── src/               # React components, services, data
├── backend/           # Backend API server
│   └── src/           # Express routes, services, types
├── docs/              # Generated documentation (this file)
└── .bmad/             # BMad Method workflows
```

---

## Core Features

### 1. Real-Time Server Monitoring
- Continuous ping monitoring with configurable intervals
- Consecutive success/failure tracking for stability
- Automatic status change detection
- Live dashboard updates without page refresh

### 2. Disk Space Monitoring
- **SNMP Support:** Query `hrStorageTable` for Windows/Linux systems
- **NetApp Support:** REST or ZAPI integration for LUN monitoring
- **Multi-Disk:** Up to 3 disks per server displayed
- **Visual Warnings:**
  - Gray: < 80% usage
  - Orange (pulsing): 80-89% usage
  - Red (pulsing): 90%+ usage

### 3. Visual Dashboard
- **Server Grouping:** Organized by logical categories (data centers, functions)
- **Responsive Grid Layout:** 4 rows with proportional container sizing
- **Color-Coded Cards:**
  - Green background: Server online
  - Red background with animation: Server offline
- **Fixed Card Height:** 140px for consistent layout

### 4. Audio Notifications
- Sound alerts when server status changes
- Different sounds for online vs offline events
- Integrated with real-time SSE updates

### 5. Server Configuration
- JSON-based server list (`backend/servers.json`)
- Per-server SNMP configuration (indexes, disk names)
- Per-server NetApp configuration (username, password, LUN paths)
- Hot-reload on configuration changes (backend restart required)

---

## Technology Deep Dive

### Frontend Technologies

**React 18**
- Functional components with Hooks
- Component hierarchy: App → Dashboard → ServerContainer → DeviceCard
- State management via `useState`, `useEffect`
- Props-based data flow

**TypeScript**
- Strict mode enabled
- Type safety for props, state, API responses
- Custom type definitions for ServerData, DiskInfo

**Vite**
- Lightning-fast HMR (Hot Module Replacement)
- Optimized bundling with Rollup
- Dev server with API proxy to backend
- ES modules for modern browsers

**Tailwind CSS**
- Utility-first CSS framework
- Custom theme with Aller font family
- Custom keyframe animations (glow-pulse)
- Responsive design utilities

**apiService (Singleton)**
- API client for REST endpoints
- EventSource manager for SSE
- Local state cache (Map) for server data
- Auto-reconnection on connection loss

### Backend Technologies

**Express**
- Minimal web framework for Node.js
- RESTful API with JSON responses
- CORS middleware for cross-origin requests
- Request logging middleware

**TypeScript**
- CommonJS module output
- Strict type checking
- Shared types with frontend (duplicated currently)

**PingService (Core)**
- Extends EventEmitter for pub/sub pattern
- Manages ping monitoring loop
- Maintains server state in Map<id, ServerStatus>
- Emits `statusChange` and `diskUpdate` events
- Coordinates SNMP and NetApp polling

**SNMPService**
- SNMP v2c client using `net-snmp` library
- Queries `hrStorageTable` OID
- Converts SNMP data to DiskInfo objects
- Configurable storage indexes per server

**NetAppService**
- HTTP client for NetApp ONTAP API
- Supports REST (newer) and ZAPI (legacy) protocols
- Retrieves LUN size and space usage
- Basic authentication

**Server-Sent Events (SSE)**
- HTTP-based unidirectional push from server to client
- `text/event-stream` content type
- Heartbeat every 30 seconds to prevent timeout
- Event types: connected, initial, statusChange, diskUpdate, heartbeat

---

## Workflow

### User Workflow
1. User opens dashboard in browser
2. Dashboard loads and fetches initial server data
3. Server cards appear color-coded (green/red)
4. Dashboard connects to SSE stream for real-time updates
5. When server goes offline, card turns red with pulsing animation
6. Audio notification plays
7. When server comes back online, card turns green
8. Different audio notification plays
9. Disk usage percentages update in real-time
10. Warnings appear if disk usage exceeds thresholds

### Backend Workflow
1. Server starts and loads `servers.json`
2. PingService initializes with server list
3. Monitoring loop starts (ping each server on interval)
4. For each server ping:
   - ICMP ping sent
   - Result stored, consecutive counters updated
   - If status changed, emit `statusChange` event
5. Periodically (if SNMP enabled):
   - SNMPService queries disk usage
   - DiskInfo array updated
   - Emit `diskUpdate` event
6. EventsRoute listens for events and pushes to SSE clients

---

## Domain Concepts

### Server States
- **Online:** Server responds to ping, consecutive successes >= threshold
- **Offline:** Server doesn't respond to ping, consecutive failures >= threshold
- **Transitioning:** Status recently changed, shown via lastStatusChange timestamp

### Disk Health States
- **Normal:** < 80% usage, gray badge
- **Warning:** 80-89% usage, orange badge with slow pulse
- **Critical:** 90%+ usage, red badge with fast pulse

### Server Grouping
- **Logical Groups:** Servers organized by function or location
- **Examples:** ARAGÓ (4 servers), DATASTORE ARAGÓ (2 servers), VIRTUAL CAMPUS - AULAS (7 servers)
- **Visual Layout:** Containers sized proportionally to server count

---

## Integration Points

### External Integrations
1. **Monitored Servers (ICMP)** - Ping for availability
2. **Monitored Servers (SNMP)** - Query disk usage
3. **NetApp Storage (REST/ZAPI)** - Query LUN usage

### Internal Integrations
1. **Frontend ↔ Backend (REST)** - Initial data load, statistics
2. **Frontend ↔ Backend (SSE)** - Real-time updates
3. **PingService ↔ SNMPService** - Disk monitoring coordination
4. **PingService ↔ NetAppService** - LUN monitoring coordination

---

## Current Limitations

1. **No Persistence:** Server state lost on restart (in-memory only)
2. **No Historical Data:** No time-series storage for uptime trends
3. **No Authentication:** API and dashboard are unauthenticated
4. **No Multi-Tenancy:** Single server list for all users
5. **No Tests:** No unit or integration tests currently
6. **Hardcoded Layout:** Dashboard server grouping is not data-driven
7. **No Mobile App:** Web-only interface
8. **Single Backend Instance:** No horizontal scaling support

---

## Future Roadmap

### Short-Term Improvements
- [ ] Add unit and integration tests
- [ ] Extract shared types to common directory
- [ ] Make dashboard layout data-driven (configuration)
- [ ] Add Docker and docker-compose support
- [ ] Implement basic authentication

### Medium-Term Enhancements
- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Historical uptime tracking and charts
- [ ] Email/Slack notifications
- [ ] User management and RBAC
- [ ] Prometheus metrics export
- [ ] Configuration UI (no manual JSON editing)

### Long-Term Vision
- [ ] Mobile app (React Native)
- [ ] Plugin architecture for custom monitors
- [ ] Alert rules engine
- [ ] Multi-site monitoring
- [ ] Auto-discovery of network devices
- [ ] Integration with existing monitoring tools (Nagios, Zabbix)

---

## Quick Reference

### Development
```bash
# Start frontend
npm run dev              # http://localhost:5173

# Start backend
cd backend && npm run dev  # http://localhost:3001
```

### Production Build
```bash
# Frontend
npm run build            # Output: dist/

# Backend
cd backend && npm run build  # Output: backend/dist/
```

### Key Files
- **Frontend Entry:** `src/main.tsx`
- **Backend Entry:** `backend/src/server.ts`
- **Server Config:** `backend/servers.json`
- **Frontend Config:** `vite.config.ts`, `tailwind.config.js`
- **Backend Config:** `backend/src/config/constants.ts`

### Key Endpoints
- `GET /api/servers` - All server statuses
- `GET /api/servers/:id` - Specific server status
- `GET /api/servers/stats/summary` - Aggregate statistics
- `GET /api/events` - SSE real-time stream
- `GET /health` - Backend health check

---

## Documentation Index

For detailed documentation, see:

- [Source Tree Analysis](./source-tree-analysis.md) - Directory structure and critical folders
- [API Contracts - Backend](./api-contracts-backend.md) - REST and SSE endpoints
- [Component Inventory - Frontend](./component-inventory-frontend.md) - React components and services
- [Development Guide](./development-guide.md) - Setup, commands, troubleshooting
- [Integration Architecture](./integration-architecture.md) - How parts communicate
- [Master Index](./index.md) - Complete documentation index

---

## Contact & Contribution

**Author:** Arnau Vives Llorach

**License:** MIT

**Contributing:** (Add contribution guidelines as needed)

---

**Last Updated:** 2025-11-17
