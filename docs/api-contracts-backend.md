# API Contracts - Backend

## Overview

REST API for server monitoring with real-time updates via Server-Sent Events (SSE).

**Base URL:** `http://localhost:3001/api`

---

## Endpoints

### 1. Health Check

**GET** `/health`

Health check endpoint to verify API is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-17T12:00:00.000Z",
  "uptime": 12345.67,
  "serverCount": 42,
  "onlineCount": 38
}
```

---

### 2. Get All Servers

**GET** `/api/servers`

Retrieves the current status of all monitored servers.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "server-001",
      "name": "ARAGÓ-01",
      "ip": "192.168.1.10",
      "isOnline": true,
      "consecutiveSuccesses": 150,
      "consecutiveFailures": 0,
      "lastChecked": "2025-11-17T12:00:00.000Z",
      "lastStatusChange": "2025-11-17T08:30:00.000Z",
      "diskInfo": [
        {
          "total": 500000000000,
          "free": 250000000000,
          "used": 250000000000,
          "percentage": 50,
          "description": "C:\\ Label:  Serial Number 1a2b3c4d",
          "index": 1,
          "name": "System Drive"
        }
      ]
    }
  ]
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

---

### 3. Get Server by ID

**GET** `/api/servers/:id`

Retrieves the status of a specific server by its ID.

**Parameters:**
- `id` (path) - Server identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "server-001",
    "name": "ARAGÓ-01",
    "ip": "192.168.1.10",
    "isOnline": true,
    "consecutiveSuccesses": 150,
    "consecutiveFailures": 0,
    "lastChecked": "2025-11-17T12:00:00.000Z",
    "lastStatusChange": "2025-11-17T08:30:00.000Z",
    "diskInfo": [...]
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Server not found"
}
```

---

### 4. Get Server Statistics

**GET** `/api/servers/stats/summary`

Retrieves aggregate statistics for all monitored servers.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 42,
    "online": 38,
    "offline": 4,
    "uptime": 90
  }
}
```

---

### 5. Real-Time Status Updates (SSE)

**GET** `/api/events`

Server-Sent Events endpoint for real-time server status updates.

**Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event Types:**

#### Connected Event
```json
{
  "type": "connected",
  "message": "Connected to server status stream"
}
```

#### Initial Event
Sent immediately after connection with current state of all servers.
```json
{
  "type": "initial",
  "servers": [...]
}
```

#### Status Change Event
Sent when a server's online/offline status changes.
```json
{
  "type": "statusChange",
  "update": {
    "serverId": "server-001",
    "name": "ARAGÓ-01",
    "ip": "192.168.1.10",
    "isOnline": false,
    "previousStatus": true,
    "timestamp": "2025-11-17T12:00:00.000Z"
  }
}
```

#### Disk Update Event
Sent when disk information is updated via SNMP or NetApp API.
```json
{
  "type": "diskUpdate",
  "update": {
    "serverId": "server-001",
    "name": "ARAGÓ-01",
    "diskInfo": [...],
    "timestamp": "2025-11-17T12:00:00.000Z"
  }
}
```

#### Heartbeat Event
Sent every 30 seconds to keep connection alive.
```json
{
  "type": "heartbeat",
  "timestamp": "2025-11-17T12:00:00.000Z"
}
```

---

## Data Types

### ServerConfig
Server configuration loaded from `servers.json`:
```typescript
{
  id: string;
  name: string;
  ip: string;
  dnsAddress: string;
  snmp?: {
    enabled: boolean;
    storageIndexes: number[];
    disks?: Array<{
      index: number;
      name?: string;
    }>;
  };
  netapp?: {
    enabled: boolean;
    apiType?: 'rest' | 'zapi';
    username: string;
    password: string;
    luns: Array<{
      name: string;
      path: string;
    }>;
  };
}
```

### DiskInfo
```typescript
{
  total: number;       // Bytes
  free: number;        // Bytes
  used: number;        // Bytes
  percentage: number;  // 0-100
  description?: string; // SNMP description
  index?: number;       // SNMP storage index
  name?: string;        // Custom name from config
}
```

---

## CORS Configuration

**Allowed Origins:** `http://localhost:5173` (Vite dev server)

**Allowed Methods:** GET, POST, OPTIONS

**Allowed Headers:** Content-Type, Authorization, Cache-Control

**Credentials:** Enabled

---

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `404` - Resource not found
- `500` - Internal server error
