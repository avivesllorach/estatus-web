# Estatus-Web User Guide & Operations Manual

## Overview

This comprehensive guide covers day-to-day operations, user workflows, and maintenance procedures for the Estatus-Web server monitoring application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Interface Overview](#user-interface-overview)
3. [Daily Operations](#daily-operations)
4. [Server Management](#server-management)
5. [Dashboard Configuration](#dashboard-configuration)
6. [Monitoring and Alerting](#monitoring-and-alerting)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Maintenance Procedures](#maintenance-procedures)
9. [Advanced Features](#advanced-features)

## Getting Started

### First Login and Setup

1. **Access the Application**
   - Open your web browser
   - Navigate to your Estatus-Web URL (e.g., `https://estatus.company.com`)
   - The dashboard will load with the current server status

2. **Initial Dashboard View**
   - Green indicators = servers are online
   - Red indicators = servers are offline
   - Yellow indicators = warnings or degraded performance
   - Real-time updates occur automatically every 5 seconds

3. **Navigation**
   - **Dashboard Tab**: Main monitoring view
   - **Configuration Tab**: Add/edit servers and groups
   - **Settings Tab**: Application preferences

### Basic Concepts

- **Servers**: Individual servers or devices being monitored
- **Groups**: Collections of servers organized by function, location, or team
- **Rows**: Visual layout rows (1-4) for organizing servers on the dashboard
- **Real-time Updates**: Automatic status updates using Server-Sent Events

## User Interface Overview

### Dashboard Main View

```
┌─────────────────────────────────────────────────────────────┐
│ [Dashboard] [Configuration] [Settings]                    │
├─────────────────────────────────────────────────────────────┤
│ Row 1: ┌─────┐ ┌─────┐ ┌─────┐                            │
│        │Web1 │ │DB1  │ │App1 │                            │
│        │ ●   │ │ ●   │ │ ●   │                            │
│        └─────┘ └─────┘ └─────┘                            │
├─────────────────────────────────────────────────────────────┤
│ Row 2: ┌─────┐ ┌─────┐                                    │
│        │API1 │ │Cache│                                    │
│        │ ●   │ │ ●   │                                    │
│        └─────┘ └─────┘                                    │
└─────────────────────────────────────────────────────────────┘
```

### Status Indicators

| Symbol | Status | Description |
|--------|--------|-------------|
| ● Green | Online | Server responding normally |
| ● Red | Offline | Server not responding |
| ● Yellow | Warning | Server responding but with issues |
| ⚪ Gray | Disabled | Monitoring disabled |
| 🔄 Blue | Updating | Status being updated |

### Server Information Display

Each server tile shows:

- **Server Name**: Human-readable identifier
- **Status Indicator**: Current health status
- **Response Time**: Last ping response time (if available)
- **Uptime**: Percentage of uptime in last 24 hours
- **Last Check**: Timestamp of last status check

## Daily Operations

### Morning Checklist

1. **Review Dashboard Status**
   - Check for any red (offline) indicators
   - Review any yellow (warning) indicators
   - Verify all critical systems are online

2. **Check Recent Events**
   - Review any overnight outages
   - Check for recurring connection issues
   - Note any performance degradation

3. **Verify Monitoring Health**
   - Confirm real-time updates are working
   - Check that all servers are being monitored
   - Verify alert configurations are active

### Ongoing Monitoring

1. **Real-time Dashboard Monitoring**
   - Watch for status changes as they happen
   - Monitor response time trends
   - Identify patterns in server behavior

2. **Event Log Review**
   ```
   Navigate to Configuration → Event History
   Filter by:
   - Time range (last hour, day, week)
   - Server(s)
   - Event type (status change, error, maintenance)
   ```

3. **Performance Tracking**
   - Monitor average response times
   - Track uptime percentages
   - Identify servers with frequent issues

### Response Procedures

#### Server Goes Offline (Red Indicator)

1. **Immediate Actions (First 5 Minutes)**
   ```
   ✅ Verify the server is actually down
      - Try to access the server directly
      - Check network connectivity
      - Ping from multiple locations

   ✅ Check for false positives
      - Verify firewall settings
      - Check DNS resolution
      - Confirm monitoring configuration
   ```

2. **Investigation (5-15 Minutes)**
   ```
   ✅ Review recent configuration changes
   ✅ Check server logs (if accessible)
   ✅ Verify network infrastructure
   ✅ Contact relevant team members
   ```

3. **Documentation**
   ```
   ✅ Record outage start time
   ✅ Note affected services/users
   ✅ Document investigation steps
   ✅ Update incident ticket
   ```

#### Performance Issues (Yellow Indicator)

1. **Assess Impact**
   ```
   ✅ Determine affected services
   ✅ Check user impact level
   ✅ Evaluate business criticality
   ```

2. **Performance Analysis**
   ```
   ✅ Review response time trends
   ✅ Check resource utilization
   ✅ Compare with baseline performance
   ✅ Identify correlation with other events
   ```

## Server Management

### Adding a New Server

1. **Navigate to Configuration**
   ```
   Click "Configuration" tab
   Click "Add Server" button
   ```

2. **Basic Server Information**
   ```
   Server Name: Production Web Server 01
   Host/IP: 192.168.1.100 or web01.company.com
   Port: 80 (or relevant service port)
   Timeout: 5000ms
   Enabled: ✓
   ```

3. **Advanced Configuration** (Optional)
   ```
   SNMP Monitoring:
   ✓ Enable SNMP
   Community: public (or custom)
   OID: 1.3.6.1.2.1.1.1.0
   Timeout: 5000ms

   NetApp Monitoring (for NetApp systems):
   ✓ Enable NetApp
   Host: netapp.company.com
   Username: admin
   Password: ******
   Vserver: svm1
   ```

4. **Placement and Organization**
   ```
   Select Row: 1-4 (visual layout)
   Select Group: Existing group or create new
   Set Display Order: Position within row
   Add Tags: web, production, frontend
   ```

5. **Save and Verify**
   ```
   Click "Save Server"
   Verify server appears on dashboard
   Confirm status updates start within 30 seconds
   ```

### Editing Server Configuration

1. **Locate Server**
   ```
   Navigate to Configuration tab
   Find server in list or use search
   Click "Edit" next to server
   ```

2. **Modify Settings**
   ```
   Basic Settings:
   - Name, host, port, timeout

   Monitoring Options:
   - SNMP configuration
   - NetApp settings
   - Notification preferences

   Organizational:
   - Row placement
   - Group assignment
   - Tags and metadata
   ```

3. **Save Changes**
   ```
   Click "Update Server"
   Changes apply immediately
   Dashboard updates in real-time
   ```

### Removing a Server

1. **Select Server for Removal**
   ```
   Navigate to Configuration tab
   Find server in list
   Click "Delete" next to server
   ```

2. **Confirm Deletion**
   ```
   ⚠️ Warning: This action cannot be undone
   Confirm server removal
   Historical data will be preserved
   ```

### Bulk Operations

#### Import Multiple Servers

1. **Prepare CSV File**
   ```csv
   name,host,port,timeout,enabled,tags
   "Web Server 01","web01.company.com",80,5000,true,"web,production"
   "Database 01","db01.company.com",3306,5000,true,"database,production"
   "API Server","api.company.com",443,5000,true,"api,backend"
   ```

2. **Import Process**
   ```
   Configuration → Import Servers
   Select CSV file
   Preview import data
   Confirm import
   Verify results
   ```

#### Bulk Edit

```
Configuration → Select Multiple Servers
Choose action:
- Enable/Disable monitoring
- Change row placement
- Update SNMP settings
- Modify tags
- Assign to group
```

## Dashboard Configuration

### Creating Server Groups

1. **Create New Group**
   ```
   Configuration → Groups → Add Group

   Group Information:
   Name: Web Servers
   Description: Production web infrastructure
   Color: Blue (visual indicator)
   Icon: server
   ```

2. **Add Servers to Group**
   ```
   Select servers to include
   Set row placement (1-4)
   Set order within row
   Save group configuration
   ```

3. **Group Management**
   ```
   - Add/remove servers
   - Reorder within group
   - Change visual settings
   - Configure notifications
   - Set maintenance windows
   ```

### Layout Management

#### Row Configuration

The dashboard supports up to 4 rows with flexible layouts:

```
Row 1: Critical Services (Web, Database)
Row 2: Supporting Services (API, Cache, Search)
Row 3: Infrastructure (Load Balancers, Firewalls)
Row 4: Development/Staging Environments
```

#### Drag-and-Drop Arrangement

1. **Enable Edit Mode**
   ```
   Configuration → Layout Settings
   Toggle "Edit Layout"
   ```

2. **Rearrange Servers**
   ```
   Drag server tiles to new positions
   Drop in desired row and order
   Changes auto-save
   Real-time preview
   ```

3. **Exit Edit Mode**
   ```
   Toggle "Edit Layout" off
   Confirm arrangement
   ```

### Custom Views

#### Saved Layouts

```
1. Create custom view:
   Configuration → Save Layout
   Name: "Production Focus"
   Description: "Critical production systems only"

2. Filter servers:
   Include only specific groups
   Set row priorities
   Configure alert thresholds

3. Switch between views:
   Layout selector in header
   Quick access to common views
```

## Monitoring and Alerting

### Real-time Status Updates

The application automatically updates server status using Server-Sent Events:

- **Update Frequency**: Every 5 seconds
- **Connection Health**: 30-second heartbeat
- **Automatic Reconnection**: If connection lost
- **Fallback**: Manual refresh if SSE fails

### Understanding Server Status

#### Status Types

1. **Online (Green)**
   ```
   - Server responded to ping
   - Response time < timeout threshold
   - All services operational
   ```

2. **Offline (Red)**
   ```
   - No response to ping
   - Timeout threshold exceeded
   - Connection refused
   - Network unreachable
   ```

3. **Warning (Yellow)**
   ```
   - Slow response times
   - Intermittent connectivity
   - SNMP warnings
   - Performance degradation
   ```

4. **Disabled (Gray)**
   ```
   - Monitoring intentionally disabled
   - Maintenance mode active
   - Scheduled downtime
   ```

#### Performance Metrics

For each server, the following metrics are tracked:

```javascript
{
  "serverId": "web-01",
  "status": "online",
  "responseTime": 45,        // milliseconds
  "uptime": 99.8,            // percentage (last 24h)
  "lastCheck": "2024-01-20T14:30:00Z",
  "isOnline": true,
  "lastStatusChange": "2024-01-20T08:15:00Z",

  // SNMP data (if enabled)
  "snmpData": {
    "systemDescription": "Linux web-01 5.4.0",
    "uptime": "45 days, 12:34:56",
    "loadAverage": [0.15, 0.20, 0.18]
  },

  // Performance history
  "performance": {
    "avgResponseTime": 52,
    "minResponseTime": 12,
    "maxResponseTime": 145,
    "totalChecks": 17280,
    "successfulChecks": 17250,
    "failedChecks": 30
  }
}
```

### Event Types and Monitoring

The system tracks multiple event types:

#### Server Status Events

```
1. Server Online
   Triggered when server comes back online
   Auto-cleared alerts
   Performance baseline reset

2. Server Offline
   Immediate alert generation
   Escalation if persists > X minutes
   Historical impact tracking

3. Performance Warning
   Response time threshold exceeded
   Intermittent failures detected
   SNMP warning conditions
```

#### Configuration Events

```
1. Server Added/Modified/Deleted
   Configuration change logging
   Impact assessment
   Rollback capability

2. Group Layout Changes
   Visual layout updates
   Group membership changes
   Dashboard reorganization

3. Settings Updates
   Application preference changes
   Monitoring configuration updates
   Alert threshold modifications
```

### Setting Up Alerts

#### Notification Configuration

1. **Configure Email Alerts**
   ```
   Configuration → Settings → Notifications

   SMTP Settings:
   Server: smtp.company.com
   Port: 587
   Username: alerts@company.com
   Password: ******
   Use TLS: ✓

   Recipients:
   Primary: admin@company.com
   Secondary: ops@company.com
   Escalation: manager@company.com
   ```

2. **Set Alert Thresholds**
   ```
   Server Offline:
   Immediate alert: ✓
   Escalate after: 5 minutes
   Max escalation: 3 levels

   Performance Warnings:
   Response time > 1000ms: ✓
   Failure rate > 10%: ✓
   Consecutive failures > 3: ✓
   ```

3. **Advanced Alert Rules**
   ```
   Group-level alerts:
   - Multiple servers in group offline
   - Group-wide performance degradation

   Time-based rules:
   - Different thresholds for business hours
   - Weekend monitoring adjustments
   - Holiday schedule support

   Custom conditions:
   - SNMP trap alerts
   - NetApp threshold violations
   - Custom health check failures
   ```

#### Alert Management

1. **View Active Alerts**
   ```
   Dashboard → Alert Panel
   Filter by severity, time, server
   Acknowledge or resolve alerts
   Add notes for team visibility
   ```

2. **Alert History**
   ```
   Configuration → Event History
   Export alert reports
   Analyze alert patterns
   Review team response times
   ```

## Troubleshooting Guide

### Common Issues

#### Dashboard Not Loading

**Symptoms:**
- Blank white screen
- Loading spinner never stops
- "Connection refused" error

**Troubleshooting Steps:**
```
1. Check application status:
   pm2 status
   pm2 logs estatus-backend
   pm2 logs estatus-frontend

2. Verify network connectivity:
   curl http://localhost:3001/api/health
   curl http://localhost:5173

3. Check browser console:
   F12 → Console tab
   Look for JavaScript errors
   Check network tab for failed requests

4. Verify reverse proxy:
   nginx -t
   systemctl status nginx
   Check proxy configuration
```

#### Real-time Updates Not Working

**Symptoms:**
- Server status not updating automatically
- Manual refresh required
- "Connection lost" notifications

**Troubleshooting Steps:**
```
1. Check SSE endpoint:
   curl -N http://localhost:3001/api/status-updates
   Should receive "heartbeat" events

2. Verify WebSocket proxy configuration:
   Check nginx/apache proxy settings
   Ensure proxy buffering disabled
   Verify timeout settings

3. Browser-specific checks:
   Test in different browser
   Check browser extensions
   Verify CORS configuration

4. Network analysis:
   Wireshark/tcpdump analysis
   Check firewall rules
   Verify TLS certificates
```

#### False Positives/Negatives

**Symptoms:**
- Server shows offline when it's online
- Server shows online when it's offline
- Intermittent status changes

**Troubleshooting Steps:**
```
1. Verify server connectivity:
   ping <server-ip>
   telnet <server-ip> <port>
   Check from multiple network points

2. Review configuration:
   Verify host/IP addresses
   Check port numbers
   Validate timeout settings
   Review firewall rules

3. Check monitoring service:
   Verify ping command works
   Check DNS resolution
   Test from application server

4. Network analysis:
   Traceroute to target server
   Check network latency
   Analyze packet loss
```

#### Performance Issues

**Symptoms:**
- Slow dashboard loading
- Delayed status updates
- High resource usage

**Troubleshooting Steps:**
```
1. Monitor application performance:
   pm2 monit
   Check memory usage
   Review CPU utilization

2. Analyze database operations:
   Check file I/O performance
   Monitor concurrent ping operations
   Review SNMP query times

3. Optimize configuration:
   Reduce ping intervals
   Limit concurrent operations
   Adjust timeout values

4. Infrastructure review:
   Check server resources
   Verify network bandwidth
   Analyze storage performance
```

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Set debug environment variables
export LOG_LEVEL=debug
export DEBUG=estatus:*

# Restart application
pm2 restart all

# Monitor logs
pm2 logs estatus-backend --lines 100
```

### Log Analysis

#### Application Logs

```bash
# Backend logs
tail -f logs/backend-error.log    # Errors only
tail -f logs/backend-out.log      # General output
tail -f logs/backend-combined.log  # All logs

# Frontend logs
tail -f logs/frontend-error.log
tail -f logs/frontend-out.log

# PM2 process logs
pm2 logs estatus-backend
pm2 logs estatus-frontend
```

#### System Logs

```bash
# System resources
htop                              # CPU/Memory usage
iotop                             # Disk I/O
netstat -tulnp                    # Network connections
ss -tulnp                         # Modern netstat

# Application-specific
lsof -i :3001                     # Backend port usage
lsof -i :5173                     # Frontend port usage
ps aux | grep node                # Node.js processes
```

## Maintenance Procedures

### Daily Maintenance

#### Automated Health Check

```bash
#!/bin/bash
# daily-health-check.sh

echo "=== Estatus-Web Daily Health Check ==="

# Check application status
if pm2 list | grep -q "estatus-backend.*online"; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not running"
    pm2 restart estatus-backend
fi

if pm2 list | grep -q "estatus-frontend.*online"; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend is not running"
    pm2 restart estatus-frontend
fi

# Check API health
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ API health check passed"
else
    echo "❌ API health check failed"
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "⚠️ Disk usage is ${DISK_USAGE}% (threshold: 80%)"
else
    echo "✅ Disk usage is ${DISK_USAGE}%"
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEMORY_USAGE -gt 80 ]; then
    echo "⚠️ Memory usage is ${MEMORY_USAGE}% (threshold: 80%)"
else
    echo "✅ Memory usage is ${MEMORY_USAGE}%"
fi

echo "=== Health Check Complete ==="
```

#### Log Rotation

```bash
#!/bin/bash
# rotate-logs.sh

LOG_DIR="./logs"
BACKUP_DIR="./logs/archive"
DATE=$(date +%Y%m%d)

# Create backup directory
mkdir -p $BACKUP_DIR

# Rotate logs if larger than 100MB
for log_file in $LOG_DIR/*.log; do
    if [ -f "$log_file" ] && [ $(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file") -gt 104857600 ]; then
        filename=$(basename "$log_file")
        mv "$log_file" "$BACKUP_DIR/${filename%.*}_${DATE}.log"
        echo "Rotated $filename"
    fi
done

# Remove logs older than 30 days
find $BACKUP_DIR -name "*.log" -mtime +30 -delete

# Restart PM2 to create new log files
pm2 restart all
```

### Weekly Maintenance

#### Performance Analysis

```bash
#!/bin/bash
# weekly-performance-analysis.sh

echo "=== Weekly Performance Analysis ==="

# Generate uptime report
curl -s "http://localhost:3001/api/servers/statistics" | jq '.' > weekly-stats.json
echo "✅ Generated statistics report"

# Analyze response times
curl -s "http://localhost:3001/api/servers/performance" | jq '.[] | select(.avgResponseTime > 1000)' > slow-servers.json
echo "✅ Identified slow servers"

# Check for patterns in failures
grep "ERROR" logs/backend-error.log | tail -100 > recent-errors.log
echo "✅ Analyzed recent errors"

# Generate summary
echo "Performance Summary for Week of $(date +%Y-%m-%d):" > performance-summary.txt
echo "Total servers monitored: $(jq '.totalServers' weekly-stats.json)" >> performance-summary.txt
echo "Average uptime: $(jq '.averageUptime' weekly-stats.json)%" >> performance-summary.txt
echo "Servers with issues: $(jq '.issuesCount' weekly-stats.json)" >> performance-summary.txt
echo "Slow response servers: $(cat slow-servers.json | jq 'length')" >> performance-summary.txt

echo "✅ Generated performance summary"
echo "=== Analysis Complete ==="
```

### Monthly Maintenance

#### Configuration Backup

```bash
#!/bin/bash
# monthly-backup.sh

BACKUP_DIR="/backup/estatus-web/monthly"
DATE=$(date +%Y%m)
BACKUP_FILE="estatus-backup-${DATE}.tar.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup configuration files
tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
    backend/servers.json \
    backend/dashboard-layout.json \
    backend/.env \
    ecosystem.config.js \
    logs/ \
    --exclude='logs/*.log'

echo "✅ Created backup: $BACKUP_FILE"

# Verify backup integrity
if tar -tzf "$BACKUP_DIR/$BACKUP_FILE" > /dev/null; then
    echo "✅ Backup integrity verified"
else
    echo "❌ Backup integrity check failed"
    exit 1
fi

# Remove backups older than 12 months
find $BACKUP_DIR -name "*.tar.gz" -mtime +365 -delete

echo "✅ Removed old backups"
```

#### System Updates

```bash
#!/bin/bash
# monthly-system-update.sh

echo "=== Monthly System Maintenance ==="

# Check for Node.js updates
CURRENT_NODE=$(node -v | cut -d'v' -f2)
LATEST_NODE=$(curl -s https://nodejs.org/dist/index.json | jq -r '.[0].version' | cut -d'v' -f2)

if [ "$CURRENT_NODE" != "$LATEST_NODE" ]; then
    echo "⚠️ Node.js update available: $LATEST_NODE (current: $CURRENT_NODE)"
    read -p "Update Node.js? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        nvm install $LATEST_NODE
        nvm use $LATEST_NODE
        npm install -g npm
        pm2 restart all
        echo "✅ Node.js updated to $LATEST_NODE"
    fi
else
    echo "✅ Node.js is up to date ($CURRENT_NODE)"
fi

# Check for npm security updates
cd backend
npm audit
read -p "Run security updates? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm audit fix
    pm2 restart estatus-backend
    echo "✅ Security updates applied"
fi

cd ..
npm audit
read -p "Run frontend security updates? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm audit fix
    npm run build
    pm2 restart estatus-frontend
    echo "✅ Frontend security updates applied"
fi

echo "=== System Maintenance Complete ==="
```

## Advanced Features

### SNMP Monitoring

#### Setting up SNMP Monitoring

1. **Enable SNMP on Target Servers**
   ```bash
   # Ubuntu/Debian
   sudo apt install snmpd
   sudo systemctl enable snmpd
   sudo systemctl start snmpd

   # Configure /etc/snmp/snmpd.conf
   rocommunity public
   sysLocation "Data Center 1"
   sysContact "admin@company.com"
   ```

2. **Configure SNMP in Estatus-Web**
   ```
   Server Configuration → SNMP Settings

   ✓ Enable SNMP monitoring
   Community: public (or custom secure string)
   OID: 1.3.6.1.2.1.1.1.0 (system description)
   Timeout: 5000ms
   Retries: 3
   Version: 2c
   ```

3. **Custom SNMP Queries**
   ```
   Advanced OID Configuration:
   - CPU Usage: 1.3.6.1.4.1.2021.11.9.0
   - Memory Usage: 1.3.6.1.4.1.2021.4.5.0
   - Disk Usage: 1.3.6.1.4.1.2021.9.1.9.1
   - Network Interface: 1.3.6.1.2.1.2.2.1.10
   ```

### NetApp Integration

#### Configuring NetApp Monitoring

1. **Enable NetApp API Access**
   ```bash
   # On NetApp cluster
   ssh cluster_admin@netapp-cluster
   options httpd.admin.access enable
   options httpd.admin.ssl.enable enable
   ```

2. **Configure API User**
   ```
   Create dedicated monitoring user:
   - Username: estatus-monitor
   - Role: readonly
   - Access: vservers and APIs
   - Authentication: password or certificate
   ```

3. **Set Up in Estatus-Web**
   ```
   Server Configuration → NetApp Settings

   ✓ Enable NetApp monitoring
   Host: netapp-cluster.company.com
   Username: estatus-monitor
   Password: ******
   Vserver: svm_production
   Timeout: 10000ms
   Use SSL: ✓
   ```

#### NetApp Metrics Available

```javascript
{
  "netappData": {
    "vserver": "svm_production",
    "volume": {
      "name": "vol_data",
      "sizeTotal": 10737418240,
      "sizeUsed": 5368709120,
      "sizeAvailable": 5368709120,
      "percentageUsed": 50
    },
    "aggregate": {
      "name": "aggr1",
      "sizeTotal": 1099511627776,
      "sizeUsed": 549755813888,
      "sizeAvailable": 549755813888
    },
    "performance": {
      "iops": 1500,
      "latency": 5.2,
      "throughput": 125000000
    },
    "status": {
      "state": "online",
      "version": "9.12.1",
      "uptime": "120 days, 15:30:45"
    }
  }
}
```

### Custom Integrations

#### Webhook Integration

```javascript
// Configure custom webhooks for events
const webhookConfig = {
  url: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
  events: [
    "server_offline",
    "server_online",
    "performance_warning",
    "configuration_change"
  ],
  format: {
    "text": "Server {{serverName}} is {{status}}",
    "attachments": [
      {
        "color": "{{statusColor}}",
        "fields": [
          {
            "title": "Response Time",
            "value": "{{responseTime}}ms",
            "short": true
          },
          {
            "title": "Uptime",
            "value": "{{uptime}}%",
            "short": true
          }
        ]
      }
    ]
  }
};
```

#### API Integration Examples

```bash
# Get current server status
curl -X GET "http://localhost:3001/api/servers/status" \
  -H "Accept: application/json"

# Add new server via API
curl -X POST "http://localhost:3001/api/config/servers" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "new-server-01",
    "name": "New Server",
    "host": "192.168.1.200",
    "port": 80,
    "enabled": true
  }'

# Get server performance metrics
curl -X GET "http://localhost:3001/api/servers/web-01/performance" \
  -H "Accept: application/json"
```

### Custom Dashboards

#### Creating Custom Views

```javascript
// Custom dashboard configuration
const customDashboard = {
  name: "Executive View",
  description: "High-level overview for management",
  layout: {
    rows: [
      {
        rowNumber: 1,
        servers: ["web-prod-01", "web-prod-02"],
        display: "compact"
      }
    ]
  },
  filters: {
    groups: ["critical-services"],
    status: ["online", "warning"],
    tags: ["production", "customer-facing"]
  },
  metrics: {
    showResponseTimes: false,
    showUptime: true,
    showDetailedStatus: false
  },
  refreshInterval: 30000 // 30 seconds
};
```

---

## Quick Reference

### Common Commands

```bash
# Application Management
pm2 start ecosystem.config.js          # Start application
pm2 restart all                        # Restart all services
pm2 stop all                           # Stop all services
pm2 logs estatus-backend               # View backend logs
pm2 monit                              # Monitor performance

# API Testing
curl http://localhost:3001/api/health # Health check
curl http://localhost:3001/api/servers # Server status
curl -N http://localhost:3001/api/status-updates # Real-time updates

# Configuration Management
npm run build                          # Build for production
npm run dev                            # Development mode
npm run test                           # Run tests
```

### Important File Locations

```
Configuration Files:
├── backend/servers.json              # Server definitions
├── backend/dashboard-layout.json     # Dashboard layout
├── backend/.env                      # Environment variables
├── ecosystem.config.js               # PM2 configuration

Log Files:
├── logs/backend-error.log            # Backend errors
├── logs/backend-out.log              # Backend output
├── logs/frontend-error.log           # Frontend errors
└── logs/frontend-out.log             # Frontend output

Data Files:
├── backend/data/                     # Runtime data
└── backup/                          # Configuration backups
```

### Emergency Procedures

```bash
# Complete application restart
pm2 kill                              # Stop all PM2 processes
pm2 start ecosystem.config.js         # Start fresh
pm2 save                              # Save configuration

# Configuration rollback
cp backup/servers_backup.json backend/servers.json
cp backup/layout_backup.json backend/dashboard-layout.json
pm2 restart estatus-backend

# Force refresh dashboard data
curl -X POST http://localhost:3001/api/admin/refresh-all
```

This comprehensive guide should help users operate and maintain Estatus-Web effectively in production environments. For additional support or specific use cases, refer to the API documentation or contact your system administrator.