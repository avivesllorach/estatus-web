# Estatus-Web Deployment Guide

## Overview

This guide provides complete instructions for deploying the Estatus-Web server monitoring application to production. Estatus-Web consists of:

- **Frontend**: React + TypeScript + Vite application (port 5173)
- **Backend**: Express.js + TypeScript API server (port 3001)
- **Storage**: JSON-based file storage (no database required)

## System Requirements

### Minimum Requirements
- **CPU**: 1 core
- **Memory**: 512MB RAM
- **Storage**: 1GB free space
- **OS**: Linux (Ubuntu 20.04+), macOS, or Windows
- **Node.js**: 18.0+ (LTS recommended)

### Recommended Requirements
- **CPU**: 2+ cores
- **Memory**: 2GB+ RAM
- **Storage**: 5GB+ free space
- **Network**: Stable internet connection for pinging monitored servers

## Pre-Deployment Checklist

### 1. System Preparation
```bash
# Install Node.js (using nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify installation
node --version  # Should be v18.x.x or higher
npm --version   # Should be 9.x.x or higher
```

### 2. Application Setup
```bash
# Clone the repository
git clone <your-repository-url>
cd estatus-web

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 3. Build Applications
```bash
# Build frontend (production)
npm run build

# Build backend (production)
cd backend
npm run build
cd ..
```

## Deployment Methods

### Method 1: Simple Production Deployment (Recommended)

#### Step 1: Environment Configuration
Create environment configuration files:

**Frontend Environment (.env.production)**
```bash
# Create in root directory
cat > .env.production << EOF
VITE_API_BASE_URL=/api
VITE_APP_TITLE=Estatus-Web Server Monitor
VITE_APP_VERSION=1.0.0
EOF
```

**Backend Environment (.env)**
```bash
# Create in backend directory
cat > backend/.env << EOF
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
LOG_LEVEL=info
PING_INTERVAL=1000
SERVER_TIMEOUT=5000
MAX_CONCURRENT_PINGS=50
EOF
```

#### Step 2: Process Management with PM2
Install PM2 for process management:
```bash
npm install -g pm2
```

Create PM2 configuration file:
```bash
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'estatus-backend',
      script: './backend/dist/index.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    },
    {
      name: 'estatus-frontend',
      script: 'serve',
      args: '-s dist -l 5173',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true
    }
  ]
};
EOF
```

Install serve package for frontend:
```bash
npm install -g serve
```

#### Step 3: Reverse Proxy Configuration

**Option A: Nginx (Recommended)**
```bash
# Install Nginx
sudo apt update
sudo apt install nginx

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/estatus-web << EOF
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    # Frontend static files
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Server-Sent Events for real-time updates
    location /api/status-updates {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_buffering off;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/estatus-web /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Option B: Apache**
```bash
# Install Apache
sudo apt update
sudo apt install apache2

# Enable required modules
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod rewrite

# Create Apache configuration
sudo tee /etc/apache2/sites-available/estatus-web.conf << EOF
<VirtualHost *:80>
    ServerName your-domain.com  # Replace with your domain

    # Frontend
    ProxyPreserveHost On
    ProxyPass / http://localhost:5173/
    ProxyPassReverse / http://localhost:5173/

    # Backend API
    ProxyPass /api http://localhost:3001/api
    ProxyPassReverse /api http://localhost:3001/api

    # WebSocket support for Server-Sent Events
    ProxyPass /api/status-updates ws://localhost:3001/api/status-updates
</VirtualHost>
EOF

# Enable the site
sudo a2ensite estatus-web.conf
sudo systemctl reload apache2
```

#### Step 4: Start Application
```bash
# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### Method 2: Docker Deployment

#### Step 1: Create Dockerfile
```bash
# Frontend Dockerfile
cat > Dockerfile.frontend << EOF
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Backend Dockerfile
cat > Dockerfile.backend << EOF
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Create data directories
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app/data

USER nodejs

EXPOSE 3001
CMD ["node", "dist/index.js"]
EOF
```

#### Step 2: Create Docker Compose
```bash
cat > docker-compose.yml << EOF
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: ../Dockerfile.backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - HOST=0.0.0.0
    volumes:
      - ./backend/data:/app/data
      - ./backend/servers.json:/app/servers.json:ro
      - ./backend/dashboard-layout.json:/app/dashboard-layout.json:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx-proxy.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
EOF
```

#### Step 3: Create Nginx Proxy Configuration
```bash
cat > nginx-proxy.conf << EOF
server {
    listen 80;

    # Frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://backend:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
```

#### Step 4: Deploy with Docker
```bash
# Build and start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Configuration

### Server Configuration
Edit `backend/servers.json` to add monitored servers:

```json
{
  "servers": [
    {
      "id": "server-1",
      "name": "Web Server",
      "host": "192.168.1.100",
      "port": 80,
      "timeout": 5000,
      "enabled": true,
      "snmp": {
        "enabled": false,
        "community": "public",
        "oid": "1.3.6.1.2.1.1.1.0"
      },
      "netapp": {
        "enabled": false,
        "host": "",
        "username": "",
        "password": "",
        "vserver": ""
      }
    }
  ]
}
```

### Dashboard Layout
Edit `backend/dashboard-layout.json` to customize the dashboard:

```json
{
  "layout": {
    "rows": [
      {
        "rowNumber": 1,
        "rowOrder": 1,
        "servers": ["server-1"]
      }
    ]
  },
  "groups": [
    {
      "id": "group-1",
      "name": "Web Servers",
      "rowNumber": 1,
      "rowOrder": 1,
      "serverIds": ["server-1"]
    }
  ]
}
```

## Security Considerations

### 1. Network Security
- Configure firewall to only allow necessary ports (80, 443)
- Use HTTPS in production (Let's Encrypt recommended)
- Consider VPN access for admin interface

### 2. Application Security
- Change default SNMP community strings
- Use environment variables for sensitive configuration
- Implement rate limiting on API endpoints
- Regular security updates

### 3. HTTPS Setup with Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Monitoring and Maintenance

### 1. Health Checks
```bash
# Backend health
curl http://localhost:3001/api/health

# Frontend health
curl http://localhost:5173
```

### 2. Log Monitoring
```bash
# PM2 logs
pm2 logs

# Application logs
tail -f logs/backend-error.log
tail -f logs/frontend-error.log
```

### 3. Performance Monitoring
```bash
# PM2 monitoring
pm2 monit

# System resources
htop
iostat -x 1
```

### 4. Backup Strategy
```bash
#!/bin/bash
# backup.sh - Backup configuration and data

BACKUP_DIR="/backup/estatus-web"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup configuration files
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
    backend/servers.json \
    backend/dashboard-layout.json \
    ecosystem.config.js \
    .env.production

# Backup PM2 configuration
pm2 save > $BACKUP_DIR/pm2_config_$DATE.json

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

Add to crontab for daily backups:
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup.sh
```

## Troubleshooting

### Common Issues

1. **Frontend Not Loading**
   ```bash
   # Check if frontend is running
   pm2 status
   pm2 logs estatus-frontend

   # Check port availability
   netstat -tlnp | grep :5173
   ```

2. **Backend API Not Responding**
   ```bash
   # Check backend status
   pm2 status
   pm2 logs estatus-backend

   # Test API directly
   curl http://localhost:3001/api/servers
   ```

3. **Real-time Updates Not Working**
   - Check WebSocket/SSE configuration in reverse proxy
   - Verify firewall allows connections
   - Check browser console for JavaScript errors

4. **High Memory Usage**
   ```bash
   # Restart applications
   pm2 restart all

   # Check for memory leaks
   pm2 monit
   ```

### Performance Optimization

1. **Increase Ping Timeout** for slow networks:
   ```bash
   # Edit backend/.env
   SERVER_TIMEOUT=10000
   ```

2. **Reduce Concurrent Pings** for limited resources:
   ```bash
   # Edit backend/.env
   MAX_CONCURRENT_PINGS=25
   ```

3. **Enable Compression** in Nginx:
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
   ```

## Scaling Considerations

While Estatus-Web is designed for small to medium deployments, you can scale by:

1. **Horizontal Scaling**: Deploy multiple instances behind a load balancer
2. **Database Migration**: Move from JSON to PostgreSQL for larger datasets
3. **Caching**: Add Redis for caching server status
4. **Monitoring**: Integrate with Prometheus/Grafana for advanced monitoring

## Support

For deployment issues:
1. Check application logs
2. Verify configuration files
3. Test network connectivity
4. Review this troubleshooting guide
5. Check the project documentation

---

## Quick Deployment Commands

```bash
# Complete deployment in 5 commands
git clone <repository> && cd estatus-web
npm install && cd backend && npm install && cd ..
npm run build && cd backend && npm run build && cd ..
npm install -g pm2 serve
pm2 start ecosystem.config.js && pm2 save && pm2 startup
```

Your Estatus-Web application should now be running and accessible via your configured domain or IP address!