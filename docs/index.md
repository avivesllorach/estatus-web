# Estatus Web - Documentation Index

> **Primary entry point for AI-assisted development and brownfield project understanding**

---

## Project Overview

**Estatus Web** is a real-time server monitoring dashboard built with React and Express, featuring live status updates via Server-Sent Events, SNMP disk monitoring, and NetApp storage integration.

**Repository Type:** Multi-part (Frontend + Backend)
**Primary Language:** TypeScript
**Architecture:** Client-Server with Real-Time Push
**Author:** Arnau Vives Llorach
**License:** MIT

---

## Quick Reference

### Project Parts

#### Frontend (Web Application)
- **Type:** React 18 + Vite Single Page Application
- **Tech Stack:** React, TypeScript, Tailwind CSS, Vite
- **Root:** `/` (project root)
- **Entry Point:** `src/main.tsx`
- **Dev Server:** http://localhost:5173

#### Backend (API Server)
- **Type:** Express REST API + SSE Server
- **Tech Stack:** Express, TypeScript, Node.js, net-snmp
- **Root:** `backend/`
- **Entry Point:** `backend/src/server.ts`
- **Server:** http://localhost:3001

### Architecture Pattern

**Frontend:** Component-based React architecture with service layer
**Backend:** Layered architecture (Routes → Services → External APIs)
**Communication:** REST API + Server-Sent Events (SSE)
**Real-Time:** Event-driven with PingService as EventEmitter

---

## Generated Documentation

### Core Documentation

- **[Project Overview](./project-overview.md)** - Executive summary, features, technology stack, roadmap
- **[Source Tree Analysis](./source-tree-analysis.md)** - Complete directory structure with annotations
- **[Integration Architecture](./integration-architecture.md)** - How frontend and backend communicate
- **[Development Guide](./development-guide.md)** - Setup instructions, commands, troubleshooting

### Technical Specifications

- **[API Contracts - Backend](./api-contracts-backend.md)** - REST endpoints, SSE events, data types
- **[Component Inventory - Frontend](./component-inventory-frontend.md)** - React components, services, data flow

### Configuration Reference

**Frontend:**
- `vite.config.ts` - Vite bundler, dev server proxy
- `tailwind.config.js` - Custom fonts, animations, theme
- `tsconfig.json` - TypeScript strict mode, React JSX

**Backend:**
- `backend/servers.json` - Server list with SNMP/NetApp config
- `backend/src/config/constants.ts` - PORT, CORS_ORIGIN
- `backend/tsconfig.json` - CommonJS output, strict mode

---

## Getting Started

### Prerequisites
- Node.js v18+ or v20+
- npm v9+
- TypeScript v5.2+

### Quick Start

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Start both servers (in separate terminals)
npm run dev                    # Frontend - http://localhost:5173
cd backend && npm run dev      # Backend - http://localhost:3001
```

For detailed setup instructions, see [Development Guide](./development-guide.md).

---

## Architecture Summary

### Frontend Architecture

```
App
└── Dashboard (orchestrator)
    └── ServerContainer (grouping)
        └── DeviceCard (display)
            └── StatusIndicator (visual)

Services:
- apiService (REST + SSE client)
- audioService (notifications)
```

**State Management:** Local component state + apiService Map cache
**Styling:** Tailwind CSS with custom animations
**Real-Time:** EventSource API for SSE connection

### Backend Architecture

```
server.ts (Express app)
├── Routes
│   ├── /api/servers (REST endpoints)
│   └── /api/events (SSE stream)
├── Services
│   ├── PingService (core monitoring + events)
│   ├── SNMPService (disk monitoring)
│   └── NetAppService (LUN monitoring)
└── External
    ├── ICMP Ping → Monitored servers
    ├── SNMP v2c → Windows/Linux servers
    └── NetApp API → Storage systems
```

**State Management:** In-memory Map in PingService
**Event System:** Node.js EventEmitter pattern
**Real-Time:** SSE with 30s heartbeat

---

## Key Technologies

### Frontend Stack
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework, component model |
| TypeScript | Type safety, developer experience |
| Vite | Build tool, dev server, HMR |
| Tailwind CSS | Utility-first styling |
| EventSource API | SSE client for real-time updates |

### Backend Stack
| Technology | Purpose |
|------------|---------|
| Express | Web framework, REST API |
| TypeScript | Type safety, shared types |
| net-snmp | SNMP v2c client for disk monitoring |
| ping | ICMP availability checks |
| Custom NetApp | REST/ZAPI integration |

### Development Tools
| Tool | Purpose |
|------|---------|
| ESLint | Code quality, linting |
| tsx | TypeScript execution with watch mode |
| npm | Package management |

---

## API Endpoints Reference

### REST Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/servers` | Fetch all server statuses |
| GET | `/api/servers/:id` | Fetch specific server |
| GET | `/api/servers/stats/summary` | Aggregate statistics |
| GET | `/health` | Backend health check |

### SSE Stream

**Endpoint:** `GET /api/events`
**Events:** connected, initial, statusChange, diskUpdate, heartbeat

For detailed API documentation, see [API Contracts](./api-contracts-backend.md).

---

## Component Reference

### React Components

| Component | File | Purpose |
|-----------|------|---------|
| App | `src/App.tsx` | Root component |
| Dashboard | `src/components/Dashboard.tsx` | Main layout, data orchestration |
| ServerContainer | `src/components/ServerContainer.tsx` | Server grouping with title |
| DeviceCard | `src/components/DeviceCard.tsx` | Individual server display |
| StatusIndicator | `src/components/StatusIndicator.tsx` | Visual status dot |

### Services

| Service | File | Purpose |
|---------|------|---------|
| apiService | `src/services/api.ts` | API client, SSE manager, cache |
| audioService | `src/services/audioService.ts` | Status change notifications |

For detailed component documentation, see [Component Inventory](./component-inventory-frontend.md).

---

## Development Commands

### Frontend

```bash
npm run dev      # Start Vite dev server (port 5173)
npm run build    # Build for production (output: dist/)
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Backend

```bash
cd backend
npm run dev      # Start with tsx watch (hot reload)
npm run build    # Compile TypeScript (output: dist/)
npm start        # Run compiled code
npm run lint     # Run ESLint
```

---

## Project Structure

```
estatus-web/
├── src/                          # Frontend source
│   ├── components/               # React components
│   ├── services/                 # API client, audio
│   ├── data/                     # Sample data
│   ├── App.tsx                   # Root component
│   └── main.tsx                  # ⭐ Entry point
├── backend/                      # Backend API server
│   ├── src/
│   │   ├── routes/               # Express routes
│   │   ├── services/             # Business logic
│   │   ├── types/                # TypeScript types
│   │   ├── config/               # Configuration
│   │   └── server.ts             # ⭐ Entry point
│   └── servers.json              # 🔧 Server configuration
├── docs/                         # Generated documentation
├── vite.config.ts                # Vite configuration
├── tailwind.config.js            # Tailwind configuration
├── package.json                  # Frontend dependencies
└── backend/package.json          # Backend dependencies
```

For complete annotated tree, see [Source Tree Analysis](./source-tree-analysis.md).

---

## Integration Flow

```
┌──────────────────┐
│  React Frontend  │
│  (Port 5173)     │
└────────┬─────────┘
         │
         │ REST + SSE
         ↓
┌──────────────────┐
│  Express Backend │
│  (Port 3001)     │
└────────┬─────────┘
         │
         │ ICMP/SNMP/NetApp
         ↓
┌──────────────────┐
│ Monitored Servers│
└──────────────────┘
```

**Data Flow:**
1. Frontend fetches initial data via REST
2. Frontend connects to SSE stream
3. Backend monitors servers via ping/SNMP
4. Backend emits events on status changes
5. SSE pushes updates to all connected clients
6. Frontend updates UI and plays sounds

For detailed integration architecture, see [Integration Architecture](./integration-architecture.md).

---

## Configuration

### Server Configuration

Edit `backend/servers.json` to add/modify monitored servers:

```json
{
  "id": "server-001",
  "name": "Server Name",
  "ip": "192.168.1.10",
  "dnsAddress": "server.domain.com",
  "snmp": {
    "enabled": true,
    "disks": [
      { "index": 1, "name": "C:\\" }
    ]
  },
  "netapp": {
    "enabled": false,
    "apiType": "rest",
    "username": "admin",
    "password": "password",
    "luns": []
  }
}
```

### Environment Variables

**Backend** (optional):
```bash
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

---

## Testing

⚠️ **Current State:** No tests implemented

**Recommended:**
- Frontend: Vitest + React Testing Library
- Backend: Jest + Supertest
- E2E: Playwright or Cypress

---

## Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
lsof -i :3001
kill -9 <PID>
```

**CORS Errors:**
- Check `backend/src/config/constants.ts` CORS_ORIGIN
- Verify Vite proxy in `vite.config.ts`

**SSE Connection Drops:**
- Backend may have restarted (clears state)
- Check Network tab in browser DevTools
- Frontend auto-reconnects after 5 seconds

For detailed troubleshooting, see [Development Guide](./development-guide.md#troubleshooting).

---

## Next Steps for AI-Assisted Development

### For Brownfield PRD Creation
When planning new features for this project:

1. **Reference this index** as the primary context source
2. **Read specific docs** based on feature type:
   - UI features → [Component Inventory](./component-inventory-frontend.md)
   - API features → [API Contracts](./api-contracts-backend.md)
   - Integration → [Integration Architecture](./integration-architecture.md)
3. **Check constraints:**
   - No authentication system (consider adding)
   - In-memory state (no persistence)
   - Hardcoded dashboard layout
   - No tests (should add before major changes)

### For Full-Stack Features
**Example:** Add authentication system

**Required Reading:**
- [Integration Architecture](./integration-architecture.md) - Understand API flow
- [API Contracts](./api-contracts-backend.md) - Current endpoints
- [Component Inventory](./component-inventory-frontend.md) - apiService structure

**Impact Areas:**
- Backend: Add auth middleware to routes
- Frontend: Add login UI, store tokens in apiService
- Both: Update type definitions

### For UI-Only Features
**Example:** Add historical uptime charts

**Required Reading:**
- [Component Inventory](./component-inventory-frontend.md) - Component structure
- [API Contracts](./api-contracts-backend.md) - Data format

**Impact Areas:**
- Frontend: New chart component, data fetching
- Backend: (Requires DB for historical data - major change)

### For API-Only Features
**Example:** Add SNMP v3 support

**Required Reading:**
- [API Contracts](./api-contracts-backend.md) - Current SNMP implementation
- [Source Tree Analysis](./source-tree-analysis.md) - SNMPService location

**Impact Areas:**
- Backend: Update SNMPService, add v3 config to servers.json

---

## Workflow Status

**Current Phase:** Analysis Complete - Documentation Generated
**Project Type:** Brownfield
**Track:** BMad Method - Brownfield
**Next Recommended Workflow:** PRD (Product Requirements Document)

To check workflow status or start PRD:
```bash
/bmad:bmm:workflows:workflow-status
/bmad:bmm:workflows:prd
```

---

## Documentation Metadata

**Generated:** 2025-11-17
**Scan Level:** Deep Scan
**Workflow Version:** 1.2.0
**Documentation Files:** 7

---

## Support & Resources

**Project Documentation:** This directory
**BMad Workflows:** `.bmad/bmm/workflows/`
**Development Guide:** [Development Guide](./development-guide.md)

---

**Ready to start planning new features? Reference this documentation in your PRD workflow for comprehensive brownfield context.**
