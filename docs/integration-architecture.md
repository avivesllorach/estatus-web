# Integration Architecture

## Overview

Estatus Web is a multi-part application consisting of a React frontend and Express backend that communicate via REST API and Server-Sent Events (SSE) for real-time server monitoring.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser Client                          │
│  ┌────────────────────────────────────────────────────────┐    │
│  │          React Frontend (Port 5173 - Dev)              │    │
│  │                                                          │    │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────────┐   │    │
│  │  │Dashboard │→ │ServerContainer│→ │   DeviceCard   │   │    │
│  │  └────┬─────┘  └──────────────┘  └────────────────┘   │    │
│  │       │                                                 │    │
│  │       ↓                                                 │    │
│  │  ┌─────────────┐          ┌──────────────────┐        │    │
│  │  │ apiService  │←────────→│  audioService    │        │    │
│  │  └─────┬───────┘          └──────────────────┘        │    │
│  └────────┼────────────────────────────────────────────────┘  │
└───────────┼────────────────────────────────────────────────────┘
            │
            │ HTTP REST + SSE
            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Express Backend (Port 3001)                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                       server.ts                             │ │
│  │                                                              │ │
│  │  ┌──────────────┐          ┌──────────────┐               │ │
│  │  │   /api/*     │          │  /api/events │               │ │
│  │  │   Routes     │          │  (SSE Stream)│               │ │
│  │  └──────┬───────┘          └──────┬───────┘               │ │
│  │         │                          │                        │ │
│  │         ↓                          ↓                        │ │
│  │  ┌──────────────────────────────────────────┐             │ │
│  │  │          PingService (Core)              │             │ │
│  │  │  - Ping monitoring loop                  │             │ │
│  │  │  - EventEmitter for real-time updates   │             │ │
│  │  │  - State management (Map<id, status>)   │             │ │
│  │  └────┬────────────────────┬────────────────┘             │ │
│  │       │                    │                               │ │
│  │       ↓                    ↓                               │ │
│  │  ┌────────────┐      ┌──────────────┐                    │ │
│  │  │SNMPService │      │NetAppService │                    │ │
│  │  └────────────┘      └──────────────┘                    │ │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ Ping, SNMP, NetApp API
                            ↓
                ┌───────────────────────────┐
                │   Monitored Servers       │
                │  - Windows/Linux servers  │
                │  - SNMP-enabled devices   │
                │  - NetApp storage         │
                └───────────────────────────┘
```

---

## Integration Points

### 1. Frontend ↔ Backend (HTTP REST)

**Communication Type:** HTTP REST API

**Direction:** Frontend → Backend

**Endpoints Used:**

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `/api/servers` | GET | Fetch all server statuses | None | `ApiResponse<ServerStatus[]>` |
| `/api/servers/:id` | GET | Fetch specific server | `id` param | `ApiResponse<ServerStatus>` |
| `/api/servers/stats/summary` | GET | Fetch statistics | None | `ApiResponse<Stats>` |
| `/health` | GET | Health check | None | Health status object |

**Data Format:** JSON

**Authentication:** None (no auth currently implemented)

**CORS Configuration:**
- **Allowed Origin:** `http://localhost:5173` (Vite dev server)
- **Allowed Methods:** GET, POST, OPTIONS
- **Credentials:** Enabled

**Proxy Setup (Development):**
- Vite dev server proxies `/api/*` to `http://localhost:3001`
- Configured in `vite.config.ts`
- Allows frontend to use relative URLs

**Error Handling:**
- All responses use `ApiResponse<T>` wrapper
- `success: boolean` flag
- `error: string` for failures
- HTTP status codes: 200 (success), 404 (not found), 500 (server error)

---

### 2. Frontend ↔ Backend (Server-Sent Events)

**Communication Type:** Server-Sent Events (SSE)

**Direction:** Backend → Frontend (one-way push)

**Endpoint:** `GET /api/events`

**Protocol:** EventSource API (browser native)

**Connection Lifecycle:**
1. Frontend opens EventSource connection on mount
2. Backend sends "connected" message
3. Backend sends "initial" message with all current server statuses
4. Backend pushes "statusChange" events when servers go online/offline
5. Backend pushes "diskUpdate" events when disk space changes
6. Backend sends "heartbeat" every 30 seconds to keep connection alive
7. On disconnect, frontend auto-reconnects after 5 seconds

**Event Types:**

```typescript
// Connected
{ type: "connected", message: string }

// Initial data
{ type: "initial", servers: ServerData[] }

// Status change
{
  type: "statusChange",
  update: {
    serverId: string,
    name: string,
    ip: string,
    isOnline: boolean,
    previousStatus: boolean,
    timestamp: string
  }
}

// Disk update
{
  type: "diskUpdate",
  update: {
    serverId: string,
    name: string,
    diskInfo: DiskInfo[] | null,
    timestamp: string
  }
}

// Heartbeat
{ type: "heartbeat", timestamp: string }
```

**State Synchronization:**
- Backend maintains authoritative server state in `PingService`
- Frontend maintains local cache in `apiService` (Map)
- SSE events update frontend cache incrementally
- Frontend re-renders components on cache updates

**Reconnection Strategy:**
- EventSource auto-reconnects on connection loss
- Frontend implements additional 5-second delayed reconnection
- No message queue (missed events not replayed)

**Audio Notifications:**
- Frontend plays sound on `statusChange` events
- Online sound when `isOnline: true`
- Offline sound when `isOnline: false`
- Handled by `audioService.ts`

---

### 3. Backend ↔ Monitored Servers (External)

**Integration Methods:**

#### A. Ping Monitoring
- **Protocol:** ICMP Echo Request/Reply
- **Library:** `ping` npm package
- **Frequency:** Configurable interval (default varies)
- **Purpose:** Server availability detection
- **State Tracking:** Consecutive successes/failures for stability

#### B. SNMP Monitoring
- **Protocol:** SNMP v2c
- **Library:** `net-snmp`
- **OID Queried:** `hrStorageTable` (Host Resources MIB)
- **Purpose:** Disk space monitoring
- **Configuration:** Per-server in `servers.json`
- **Data Retrieved:**
  - `hrStorageDescr` - Disk description
  - `hrStorageSize` - Total size
  - `hrStorageUsed` - Used space
  - `hrStorageAllocationUnits` - Block size

#### C. NetApp API Integration
- **Protocol:** HTTPS REST or ZAPI (XML-based)
- **Library:** `netappService.ts` (custom)
- **Purpose:** LUN (Logical Unit Number) monitoring
- **Authentication:** Username/password
- **Configuration:** Per-server in `servers.json`
- **Data Retrieved:** LUN size and usage

---

## Data Flow

### Initial Load Sequence

```
1. User opens browser → http://localhost:5173
2. Dashboard mounts
3. apiService.fetchServers() → GET /api/servers
4. Backend returns all current server statuses
5. Frontend renders ServerContainer + DeviceCard components
6. apiService.connectToStatusUpdates() → EventSource /api/events
7. Backend sends "connected" message
8. Backend sends "initial" message with current state
9. Frontend updates local cache (redundant but ensures sync)
```

### Real-Time Update Sequence

```
1. PingService pings server (every X seconds)
2. Server status changes (online → offline or vice versa)
3. PingService emits "statusChange" event (EventEmitter)
4. EventsRoute handler receives event
5. EventsRoute formats SSE message
6. EventsRoute sends message to all connected clients
7. Frontend EventSource receives message
8. apiService.handleEventMessage() processes event
9. apiService updates local Map cache
10. apiService triggers callback with updated server array
11. Dashboard updates state
12. React re-renders affected DeviceCard components
13. audioService plays notification sound
```

### Disk Update Sequence

```
1. PingService triggers SNMP/NetApp poll
2. SNMPService or NetAppService queries server
3. Disk data retrieved and parsed
4. PingService emits "diskUpdate" event
5. EventsRoute sends SSE message to clients
6. Frontend updates disk info in local cache
7. DeviceCard re-renders with new disk percentages
8. Color-coded warnings appear if disk > 80% or 90%
```

---

## Shared Concepts

### Shared TypeScript Types

While types are currently duplicated, they share the same structure:

**Frontend:** `src/services/api.ts`
**Backend:** `backend/src/types/server.ts`

**Key Types:**
- `ServerData` / `ServerStatus` - Server state
- `DiskInfo` - Disk usage data
- `ApiResponse<T>` - Standard API response wrapper
- `StatusUpdate` - Status change event
- `DiskUpdate` - Disk change event

**Future Improvement:** Extract to `shared/types/` directory

---

## Security Considerations

### Current State
- ⚠️ No authentication
- ⚠️ No authorization
- ⚠️ CORS limited to localhost
- ⚠️ Credentials in `servers.json` (NetApp passwords)

### Recommendations for Production
1. Add API authentication (JWT, API keys)
2. Encrypt credentials (use secrets manager)
3. Implement HTTPS/TLS
4. Add rate limiting
5. Validate and sanitize inputs
6. Implement RBAC for multi-tenancy

---

## Scalability Considerations

### Current Architecture
- **Frontend:** Static SPA, can serve from CDN
- **Backend:** Single-process Node.js server
- **Monitoring:** In-memory state, lost on restart

### Bottlenecks
1. Single backend process (CPU-bound for many servers)
2. In-memory state (no persistence)
3. SSE connections scale linearly with clients

### Scaling Strategies
1. **Horizontal Scaling:**
   - Add load balancer
   - Use sticky sessions for SSE
   - Shared state via Redis/Database

2. **Monitoring Optimization:**
   - Batch ping operations
   - Async SNMP polling
   - Cache disk data (lower poll frequency)

3. **State Persistence:**
   - PostgreSQL/MongoDB for server configurations
   - Redis for real-time state cache
   - Time-series DB (InfluxDB) for historical data

---

## Deployment Architecture

### Development
```
Frontend: http://localhost:5173 (Vite dev server)
Backend:  http://localhost:3001 (tsx watch)
Proxy:    Vite proxies /api to backend
```

### Production (Recommended)
```
┌─────────────────────────────────────┐
│      Nginx Reverse Proxy            │
│  - Serves frontend static files     │
│  - Proxies /api to backend          │
│  - SSL/TLS termination              │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       ↓                ↓
┌─────────────┐  ┌─────────────┐
│  Frontend   │  │   Backend   │
│  (Static)   │  │  (PM2/Node) │
│  /var/www/  │  │  Port 3001  │
└─────────────┘  └─────────────┘
```

**Example Nginx Config:**
```nginx
server {
  listen 80;
  server_name status.example.com;

  # Frontend
  location / {
    root /var/www/estatus-web;
    try_files $uri /index.html;
  }

  # Backend API
  location /api {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  # SSE requires special headers
  location /api/events {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 86400s;
  }
}
```

---

## Technology Choices Rationale

**Why SSE instead of WebSockets?**
- ✅ Simpler protocol (HTTP-based)
- ✅ Auto-reconnection built-in
- ✅ One-way push sufficient (no client → server real-time needed)
- ✅ Better firewall compatibility
- ❌ No binary data support (not needed here)

**Why REST + SSE instead of GraphQL + Subscriptions?**
- ✅ Simpler implementation for small API surface
- ✅ No schema complexity
- ✅ Direct mapping to Express routes
- ❌ Less flexible for complex queries (not needed)

**Why Express instead of NestJS/Fastify?**
- ✅ Lightweight for simple API
- ✅ Well-known, easy to understand
- ✅ Good ecosystem for SNMP/ping libraries
- ❌ Less structure for large codebases

---

## Future Integration Opportunities

1. **Database Integration:**
   - Store server configurations
   - Log historical status changes
   - Track uptime statistics

2. **Notification Integration:**
   - Email alerts on server down
   - Slack/Discord webhooks
   - SMS via Twilio

3. **Metrics Export:**
   - Prometheus exporter endpoint
   - Grafana dashboards
   - OpenTelemetry tracing

4. **Third-Party Monitoring:**
   - Integrate with existing monitoring (Nagios, Zabbix)
   - Import server lists from CMDB

5. **Mobile App:**
   - React Native app consuming same API
   - Push notifications for status changes
