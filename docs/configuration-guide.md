# Estatus-Web Configuration Guide

## Overview

This guide covers all configuration aspects of Estatus-Web, including environment variables, server configuration files, and application settings.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Configuration Files](#configuration-files)
3. [Server Configuration](#server-configuration)
4. [Dashboard Layout Configuration](#dashboard-layout-configuration)
5. [Group Management](#group-management)
6. [Advanced Configuration](#advanced-configuration)
7. [Security Configuration](#security-configuration)

## Environment Variables

### Backend Environment Variables (.env)

Create a `.env` file in the `backend/` directory:

```bash
# Node Environment
NODE_ENV=production                    # production, development, or test

# Server Configuration
PORT=3001                              # Backend server port (default: 3001)
HOST=0.0.0.0                           # Host IP to bind to (default: 127.0.0.1)

# Logging
LOG_LEVEL=info                         # Log level: error, warn, info, debug, trace

# Monitoring Configuration
PING_INTERVAL=1000                     # Ping interval in milliseconds (default: 1000)
SERVER_TIMEOUT=5000                    # Server timeout in milliseconds (default: 5000)
MAX_CONCURRENT_PINGS=50                # Maximum concurrent ping operations (default: 50)

# File Paths (can be overridden)
SERVERS_FILE=./servers.json            # Path to servers configuration file
LAYOUT_FILE=./dashboard-layout.json    # Path to dashboard layout configuration
LOGS_DIR=./logs                        # Directory for log files
DATA_DIR=./data                        # Directory for runtime data

# SNMP Configuration
SNMP_COMMUNITY=public                  # Default SNMP community string
SNMP_TIMEOUT=5000                      # SNMP request timeout in milliseconds
SNMP_RETRIES=3                         # Number of SNMP request retries

# NetApp Configuration
NETAPP_TIMEOUT=10000                   # NetApp API timeout in milliseconds
```

### Frontend Environment Variables

Create a `.env.production` file in the root directory for production:

```bash
# API Configuration
VITE_API_BASE_URL=/api                 # Backend API base URL
VITE_APP_TITLE=Estatus-Web             # Application title
VITE_APP_VERSION=1.0.0                # Application version
VITE_APP_DESCRIPTION=Server Monitor    # Application description

# Real-time Updates
VITE_WEBSOCKET_URL=/api/status-updates # Server-Sent Events endpoint

# Feature Flags
VITE_ENABLE_SNMP=true                  # Enable SNMP features
VITE_ENABLE_NETAPP=true                # Enable NetApp features
VITE_ENABLE_NOTIFICATIONS=true         # Enable browser notifications
VITE_ENABLE_DARK_MODE=true             # Enable dark mode toggle

# UI Configuration
VITE_REFRESH_INTERVAL=5000             # Auto-refresh interval in milliseconds
VITE_MAX_SERVERS_DISPLAY=100           # Maximum servers to display without pagination
VITE_ANIMATION_DURATION=300            # UI animation duration in milliseconds
```

## Configuration Files

### Server Configuration (backend/servers.json)

This file defines all servers to be monitored:

```json
{
  "servers": [
    {
      "id": "web-server-01",
      "name": "Main Web Server",
      "host": "192.168.1.100",
      "port": 80,
      "timeout": 5000,
      "enabled": true,
      "displayOrder": 1,
      "tags": ["web", "production"],

      "snmp": {
        "enabled": true,
        "community": "public",
        "oid": "1.3.6.1.2.1.1.1.0",
        "timeout": 5000,
        "retries": 3
      },

      "netapp": {
        "enabled": false,
        "host": "netapp.example.com",
        "username": "admin",
        "password": "password",
        "vserver": "svm1",
        "timeout": 10000
      },

      "notifications": {
        "email": true,
        "sms": false,
        "webhook": false,
        "emailRecipients": ["admin@example.com"],
        "webhookUrl": "https://hooks.slack.com/...",
        "alertThreshold": 3
      },

      "maintenance": {
        "window": {
          "enabled": false,
          "start": "02:00",
          "end": "04:00",
          "timezone": "UTC",
          "days": [0, 1, 2, 3, 4, 5, 6]
        },
        "schedule": {
          "enabled": false,
          "dates": ["2024-01-15", "2024-02-20"],
          "reason": "Scheduled maintenance"
        }
      }
    }
  ]
}
```

### Dashboard Layout Configuration (backend/dashboard-layout.json)

This file defines the dashboard layout and server groups:

```json
{
  "layout": {
    "rows": [
      {
        "rowNumber": 1,
        "rowOrder": 1,
        "servers": ["web-server-01", "db-server-01"]
      },
      {
        "rowNumber": 2,
        "rowOrder": 1,
        "servers": ["api-server-01", "cache-server-01"]
      }
    ]
  },
  "groups": [
    {
      "id": "web-servers",
      "name": "Web Servers",
      "rowNumber": 1,
      "rowOrder": 1,
      "serverIds": ["web-server-01"],
      "enabled": true,
      "displayOrder": 1,

      "visualSettings": {
        "color": "#3B82F6",
        "icon": "server",
        "collapsed": false
      },

      "notifications": {
        "enabled": true,
        "emailRecipients": ["admin@example.com"],
        "alertLevel": "warning"
      }
    },
    {
      "id": "database-servers",
      "name": "Database Servers",
      "rowNumber": 1,
      "rowOrder": 2,
      "serverIds": ["db-server-01"],
      "enabled": true,
      "displayOrder": 2
    }
  ],
  "settings": {
    "autoRefresh": true,
    "refreshInterval": 5000,
    "theme": "light",
    "compactView": false,
    "showInactive": true,
    "defaultGroup": "all-servers"
  }
}
```

## Server Configuration

### Basic Server Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique server identifier |
| `name` | string | Yes | Human-readable server name |
| `host` | string | Yes | Server IP address or hostname |
| `port` | number | Yes | Port to ping (default: 80) |
| `timeout` | number | No | Ping timeout in ms (default: 5000) |
| `enabled` | boolean | No | Whether monitoring is enabled (default: true) |
| `displayOrder` | number | No | Display order in lists (default: 0) |
| `tags` | string[] | No | Server tags for filtering and grouping |

### SNMP Configuration

```json
{
  "snmp": {
    "enabled": true,
    "community": "public",
    "oid": "1.3.6.1.2.1.1.1.0",
    "timeout": 5000,
    "retries": 3,
    "version": "2c"
  }
}
```

**SNMP Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | false | Enable SNMP monitoring |
| `community` | string | "public" | SNMP community string |
| `oid` | string | "1.3.6.1.2.1.1.1.0" | SNMP OID to query |
| `timeout` | number | 5000 | SNMP timeout in ms |
| `retries` | number | 3 | Number of retries |
| `version` | string | "2c" | SNMP version (1, 2c, 3) |

### NetApp Configuration

```json
{
  "netapp": {
    "enabled": true,
    "host": "netapp.example.com",
    "username": "admin",
    "password": "password",
    "vserver": "svm1",
    "timeout": 10000,
    "ssl": true
  }
}
```

**NetApp Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `enabled` | boolean | Yes | Enable NetApp monitoring |
| `host` | string | Yes | NetApp cluster hostname |
| `username` | string | Yes | NetApp admin username |
| `password` | string | Yes | NetApp admin password |
| `vserver` | string | Yes | SVM/vserver name |
| `timeout` | number | No | API timeout in ms (default: 10000) |
| `ssl` | boolean | No | Use HTTPS (default: true) |

## Dashboard Layout Configuration

### Row Configuration

```json
{
  "layout": {
    "rows": [
      {
        "rowNumber": 1,
        "rowOrder": 1,
        "servers": ["server-1", "server-2"]
      }
    ]
  }
}
```

**Row Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `rowNumber` | number | Row position (1-4) |
| `rowOrder` | number | Order within row (1-4) |
| `servers` | string[] | Array of server IDs |

### Group Configuration

```json
{
  "groups": [
    {
      "id": "web-servers",
      "name": "Web Servers",
      "rowNumber": 1,
      "rowOrder": 1,
      "serverIds": ["web-1", "web-2"],
      "enabled": true,
      "displayOrder": 1,
      "visualSettings": {
        "color": "#3B82F6",
        "icon": "server",
        "collapsed": false
      },
      "notifications": {
        "enabled": true,
        "emailRecipients": ["admin@example.com"],
        "alertLevel": "warning"
      }
    }
  ]
}
```

**Group Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique group identifier |
| `name` | string | Yes | Human-readable group name |
| `rowNumber` | number | Yes | Row position (1-4) |
| `rowOrder` | number | Yes | Order within row (1-4) |
| `serverIds` | string[] | Yes | Array of server IDs |
| `enabled` | boolean | No | Group enabled (default: true) |
| `displayOrder` | number | No | Display order (default: 0) |

## Advanced Configuration

### Performance Tuning

```bash
# High-performance server (100+ servers)
MAX_CONCURRENT_PINGS=100
PING_INTERVAL=2000
SERVER_TIMEOUT=3000

# Low-resource environment (< 10 servers)
MAX_CONCURRENT_PINGS=20
PING_INTERVAL=5000
SERVER_TIMEOUT=8000
```

### Logging Configuration

```bash
# Verbose logging for debugging
LOG_LEVEL=debug

# Production logging
LOG_LEVEL=info

# Minimal logging
LOG_LEVEL=error
```

### File Path Configuration

```bash
# Custom file locations
SERVERS_FILE=/etc/estatus/servers.json
LAYOUT_FILE=/etc/estatus/dashboard-layout.json
LOGS_DIR=/var/log/estatus
DATA_DIR=/var/lib/estatus/data
```

### Development Environment

```bash
# Development mode (.env.development)
NODE_ENV=development
LOG_LEVEL=debug
PORT=3001
HOST=localhost
PING_INTERVAL=1000
```

### Production Environment

```bash
# Production mode (.env.production)
NODE_ENV=production
LOG_LEVEL=info
PORT=3001
HOST=0.0.0.0
PING_INTERVAL=2000
MAX_CONCURRENT_PINGS=50
```

## Security Configuration

### Environment Variable Security

Store sensitive values in environment variables:

```bash
# SNMP credentials
SNMP_COMMUNITY=${SNMP_COMMUNITY}

# NetApp credentials
NETAPP_USERNAME=${NETAPP_USERNAME}
NETAPP_PASSWORD=${NETAPP_PASSWORD}

# Notification credentials
EMAIL_PASSWORD=${EMAIL_PASSWORD}
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}
```

### File Permissions

```bash
# Secure configuration files
chmod 600 backend/.env
chmod 644 backend/servers.json
chmod 644 backend/dashboard-layout.json
chmod 755 backend/data
chmod 755 backend/logs
```

### CORS Configuration

```javascript
// backend/src/app.js - Custom CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200
}));
```

## Configuration Validation

### Server Configuration Validation

The API validates server configurations with these rules:

```json
{
  "validationRules": {
    "id": {
      "required": true,
      "pattern": "^[a-zA-Z0-9_-]+$",
      "maxLength": 50
    },
    "name": {
      "required": true,
      "minLength": 1,
      "maxLength": 100
    },
    "host": {
      "required": true,
      "format": "hostname-or-ip"
    },
    "port": {
      "required": true,
      "minimum": 1,
      "maximum": 65535
    },
    "timeout": {
      "minimum": 1000,
      "maximum": 30000
    }
  }
}
```

### Layout Configuration Validation

```json
{
  "validationRules": {
    "rowNumber": {
      "minimum": 1,
      "maximum": 4
    },
    "rowOrder": {
      "minimum": 1,
      "maximum": 4
    },
    "maxServersPerRow": 6
  }
}
```

## Configuration Examples

### Basic Monitoring Setup

```json
{
  "servers": [
    {
      "id": "web-01",
      "name": "Web Server 1",
      "host": "web01.example.com",
      "port": 80,
      "enabled": true
    },
    {
      "id": "db-01",
      "name": "Database Server 1",
      "host": "db01.example.com",
      "port": 3306,
      "enabled": true
    }
  ]
}
```

### SNMP Monitoring Setup

```json
{
  "servers": [
    {
      "id": "router-01",
      "name": "Core Router",
      "host": "192.168.1.1",
      "port": 80,
      "snmp": {
        "enabled": true,
        "community": "M7rs54Ax",
        "oid": "1.3.6.1.2.1.1.1.0"
      }
    }
  ]
}
```

### Production Layout

```json
{
  "layout": {
    "rows": [
      {
        "rowNumber": 1,
        "rowOrder": 1,
        "servers": ["web-01", "web-02", "load-balancer"]
      },
      {
        "rowNumber": 2,
        "rowOrder": 1,
        "servers": ["db-01", "db-02", "cache-01"]
      }
    ]
  },
  "groups": [
    {
      "id": "frontend",
      "name": "Frontend Services",
      "rowNumber": 1,
      "rowOrder": 1,
      "serverIds": ["web-01", "web-02", "load-balancer"]
    },
    {
      "id": "backend",
      "name": "Backend Services",
      "rowNumber": 2,
      "rowOrder": 1,
      "serverIds": ["db-01", "db-02", "cache-01"]
    }
  ]
}
```

## Configuration Management

### Hot Reloading

Configuration changes are automatically detected and applied:

```bash
# Backend will watch these files for changes:
# - backend/servers.json
# - backend/dashboard-layout.json

# Changes trigger immediate updates to connected clients
# No restart required
```

### Backup Configuration

```bash
#!/bin/bash
# backup-config.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/estatus-web"

mkdir -p $BACKUP_DIR

# Backup configuration files
cp backend/servers.json $BACKUP_DIR/servers_$DATE.json
cp backend/dashboard-layout.json $BACKUP_DIR/layout_$DATE.json
cp backend/.env $BACKUP_DIR/env_$DATE.txt

# Create compressed backup
tar -czf $BACKUP_DIR/estatus-config_$DATE.tar.gz \
  $BACKUP_DIR/servers_$DATE.json \
  $BACKUP_DIR/layout_$DATE.json \
  $BACKUP_DIR/env_$DATE.txt

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### Configuration Migration

When upgrading from older versions, the system automatically migrates:

1. **Legacy Group Migration**: Converts old `row/position` format to `rowNumber/rowOrder`
2. **Default Values**: Adds missing required fields with sensible defaults
3. **Type Validation**: Ensures all fields match expected types
4. **File Backup**: Creates backup before migration

### Testing Configuration

```bash
# Validate server configuration
curl -X GET http://localhost:3001/api/config/servers
# Check response for validation errors

# Validate layout configuration
curl -X GET http://localhost:3001/api/config/layout
# Check response for validation errors

# Test server connectivity
curl -X GET http://localhost:3001/api/servers/status
# Verify servers respond correctly
```

## Troubleshooting Configuration

### Common Issues

1. **Invalid JSON**
   ```bash
   # Validate JSON syntax
   node -e "console.log(JSON.parse(require('fs').readFileSync('backend/servers.json', 'utf8')))"
   ```

2. **Missing Required Fields**
   ```bash
   # Check API response for validation errors
   curl -s http://localhost:3001/api/config/servers | jq .
   ```

3. **Permission Issues**
   ```bash
   # Check file permissions
   ls -la backend/servers.json backend/dashboard-layout.json

   # Fix permissions if needed
   chmod 644 backend/servers.json backend/dashboard-layout.json
   ```

4. **Environment Variables Not Loading**
   ```bash
   # Check environment variables
   cd backend && node -e "require('dotenv').config(); console.log(process.env.PORT)"
   ```

### Debug Mode

Enable detailed logging to troubleshoot configuration issues:

```bash
# Set debug logging
export LOG_LEVEL=debug

# Check application logs
pm2 logs estatus-backend
```

---

## Quick Configuration Checklist

Before deploying, ensure you have:

- [ ] Created `.env` file with proper environment variables
- [ ] Configured `servers.json` with your servers to monitor
- [ ] Set up `dashboard-layout.json` with desired layout
- [ ] Verified file permissions are secure
- [ ] Tested configuration validation
- [ ] Set up backup procedures
- [ ] Configured logging levels appropriately

Your Estatus-Web application is now fully configured and ready for deployment!