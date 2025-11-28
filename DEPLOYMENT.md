# Estatus-Web Deployment Guide
## Ubuntu Server with Apache

This guide provides step-by-step instructions for deploying the Estatus-Web monitoring application on an Ubuntu server with Apache.

## Project Architecture

- **Frontend**: React/Vite application (port 5173 dev, static build for production)
- **Backend**: Express.js API server (port 3001) with SNMP and ping monitoring capabilities
- **Database**: None (monitoring data processed in real-time)

## Prerequisites

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y apache2 npm nodejs git curl ufw

# Verify Node.js and npm versions
node --version  # Should be 18+ or 20+
npm --version   # Should be 9+
```

## 1. Server Setup

```bash
# Create application directory
sudo mkdir -p /var/www/estatus-web
sudo chown -R $USER:$USER /var/www/estatus-web

# Navigate to application directory
cd /var/www/estatus-web

# Option A: Clone from Git repository
git clone <your-repo-url> .

# Option B: Copy files from local machine
# scp -r /path/to/estatus-web/* user@server:/var/www/estatus-web/
```

## 2. Backend Deployment

```bash
# Navigate to backend directory
cd /var/www/estatus-web/backend

# Install production dependencies
npm install --production

# Build the TypeScript backend
npm run build

# Test the backend server
npm start

# Stop after testing (Ctrl+C)
```

## 3. Frontend Build

```bash
# Navigate to root directory
cd /var/www/estatus-web

# Install frontend dependencies
npm install --production

# Build the frontend for production
npm run build

# The build output will be in the 'dist' directory
ls -la dist/
```

## 4. Process Management with PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the backend server with PM2
cd /var/www/estatus-web/backend
pm2 start dist/server.js --name "estatus-backend"

# Configure PM2 to start on system boot
pm2 startup
pm2 save

# Check PM2 status
pm2 status
pm2 logs estatus-backend
```

## 5. Apache Configuration

### Create Virtual Host Configuration

```bash
# Create Apache virtual host configuration
sudo nano /etc/apache2/sites-available/estatus-web.conf
```

**Apache Configuration File Content:**
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    DocumentRoot /var/www/estatus-web/dist

    # Security headers
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    # Enable CORS for API requests
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization"

    # Proxy API requests to backend
    ProxyPreserveHost On
    ProxyRequests Off

    # API proxy configuration
    ProxyPass /api http://localhost:3001/api
    ProxyPassReverse /api http://localhost:3001/api

    # WebSocket support (if needed)
    ProxyPass /socket.io http://localhost:3001/socket.io
    ProxyPassReverse /socket.io http://localhost:3001/socket.io

    # Handle static files and React Router
    <Directory /var/www/estatus-web/dist>
        AllowOverride All
        Require all granted

        # Enable fallback to index.html for React Router
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Gzip compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/plain
        AddOutputFilterByType DEFLATE text/html
        AddOutputFilterByType DEFLATE text/xml
        AddOutputFilterByType DEFLATE text/css
        AddOutputFilterByType DEFLATE application/xml
        AddOutputFilterByType DEFLATE application/xhtml+xml
        AddOutputFilterByType DEFLATE application/rss+xml
        AddOutputFilterByType DEFLATE application/javascript
        AddOutputFilterByType DEFLATE application/x-javascript
    </IfModule>

    # Error and access logs
    ErrorLog ${APACHE_LOG_DIR}/estatus-web_error.log
    CustomLog ${APACHE_LOG_DIR}/estatus-web_access.log combined
</VirtualHost>
```

## 6. Enable Apache Modules and Site

```bash
# Enable required Apache modules
sudo a2enmod rewrite headers proxy proxy_http deflate ssl

# Enable the site
sudo a2ensite estatus-web.conf

# Disable default site
sudo a2dissite 000-default.conf

# Test Apache configuration
sudo apache2ctl configtest

# Restart Apache
sudo systemctl restart apache2

# Enable Apache to start on boot
sudo systemctl enable apache2
```

## 7. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 'Apache Full'
sudo ufw enable

# Check firewall status
sudo ufw status
```

## 8. SSL Certificate with Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-apache

# Obtain and install SSL certificate
sudo certbot --apache -d your-domain.com -d www.your-domain.com

# Follow the prompts - Certbot will automatically update your Apache configuration

# Test automatic renewal
sudo certbot renew --dry-run
```

## 9. Environment Configuration

```bash
# Create environment file for backend
sudo nano /var/www/estatus-web/backend/.env
```

**Example Environment Variables:**
```env
NODE_ENV=production
PORT=3001
API_BASE_URL=https://your-domain.com/api
LOG_LEVEL=info
```

## 10. Database (Optional)

If you add a database later:

```bash
# Example for PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres createdb estatus_web
sudo -u postgres createuser --interactive
```

## 11. Monitoring and Logging

### Application Monitoring

```bash
# Check PM2 status
pm2 status

# View PM2 logs
pm2 logs estatus-backend
pm2 logs --lines 100 estatus-backend

# Monitor system resources
pm2 monit

# Restart backend if needed
pm2 restart estatus-backend
```

### Apache Logs

```bash
# Monitor Apache access logs
sudo tail -f /var/log/apache2/estatus-web_access.log

# Monitor Apache error logs
sudo tail -f /var/log/apache2/estatus-web_error.log

# Check Apache status
sudo systemctl status apache2
```

### Log Rotation Setup

```bash
# Create log rotation configuration
sudo nano /etc/logrotate.d/estatus-web
```

**Log Rotation Configuration:**
```
/var/log/apache2/estatus-web_*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data adm
    postrotate
        systemctl reload apache2
    endscript
}
```

## 12. Automated Deployment Script

Create a deployment script for future updates:

```bash
# Create deployment script
sudo nano /var/www/estatus-web/deploy.sh
```

**Deployment Script Content:**
```bash
#!/bin/bash

# Estatus-Web Deployment Script
set -e

echo "Starting deployment..."

# Navigate to application directory
cd /var/www/estatus-web

# Backup current version
cp -r dist dist_backup_$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Pull latest changes
echo "Pulling latest changes..."
git pull origin main

# Install and build frontend
echo "Building frontend..."
npm ci --production
npm run build

# Install and build backend
echo "Building backend..."
cd backend
npm ci --production
npm run build

# Restart backend service
echo "Restarting backend service..."
pm2 restart estatus-backend

# Reload Apache
echo "Reloading Apache..."
sudo systemctl reload apache2

echo "Deployment completed successfully!"
echo "Application is available at: https://your-domain.com"
```

```bash
# Make script executable
chmod +x /var/www/estatus-web/deploy.sh
```

## 13. Testing the Deployment

### Pre-deployment Testing

```bash
# Test backend locally
curl http://localhost:3001/api/health

# Test frontend build
npm run preview  # If you want to test the build locally
```

### Post-deployment Testing

```bash
# Test API via proxy
curl http://your-domain.com/api/health
curl https://your-domain.com/api/health

# Test frontend in browser
# Open http://your-domain.com or https://your-domain.com
```

### Health Check Script

```bash
# Create health check script
sudo nano /var/www/estatus-web/health-check.sh
```

**Health Check Script:**
```bash
#!/bin/bash

# Health check for Estatus-Web
echo "=== Estatus-Web Health Check ==="
echo "Timestamp: $(date)"
echo

# Check if PM2 process is running
if pm2 list | grep -q "estatus-backend.*online"; then
    echo "✅ Backend: Running"
else
    echo "❌ Backend: Not running"
fi

# Check if Apache is running
if systemctl is-active --quiet apache2; then
    echo "✅ Apache: Running"
else
    echo "❌ Apache: Not running"
fi

# Check API response
if curl -s -f http://localhost:3001/api/health > /dev/null; then
    echo "✅ API: Responding"
else
    echo "❌ API: Not responding"
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
    echo "✅ Disk Usage: ${DISK_USAGE}%"
else
    echo "⚠️  Disk Usage: ${DISK_USAGE}% (High)"
fi

echo
echo "=== System Resources ==="
echo "Memory: $(free -h | awk 'NR==2{printf "%.1f%%", $3*100/$2 }')"
echo "CPU Load: $(uptime | awk -F'load average:' '{ print $2 }')"
```

```bash
# Make health check executable
chmod +x /var/www/estatus-web/health-check.sh

# Run health check
./health-check.sh
```

## 14. Security Considerations

### Basic Security

```bash
# Disable root SSH login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart ssh

# Fail2Ban for SSH protection
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Application Security

- Keep dependencies updated: `npm audit` and `npm audit fix`
- Use environment variables for sensitive data
- Regularly update system packages: `sudo apt update && sudo apt upgrade`
- Monitor logs for suspicious activity
- Implement rate limiting on API endpoints if needed

## 15. Troubleshooting

### Common Issues

**Backend not starting:**
```bash
# Check PM2 logs
pm2 logs estatus-backend

# Check if port 3001 is available
sudo netstat -tlnp | grep :3001

# Test backend manually
cd /var/www/estatus-web/backend
node dist/server.js
```

**Apache proxy issues:**
```bash
# Check Apache error logs
sudo tail -f /var/log/apache2/estatus-web_error.log

# Test Apache configuration
sudo apache2ctl configtest

# Check if backend is accessible from Apache
curl http://localhost:3001/api/health
```

**Frontend not loading:**
```bash
# Check file permissions
ls -la /var/www/estatus-web/dist/

# Check Apache document root
grep DocumentRoot /etc/apache2/sites-available/estatus-web.conf
```

### Performance Optimization

- Enable Apache caching modules
- Use CDN for static assets
- Implement database query optimization
- Monitor and optimize memory usage
- Consider load balancing for high traffic

## 16. Maintenance

### Regular Tasks

```bash
# Weekly updates
sudo apt update && sudo apt upgrade

# Monthly dependency updates
cd /var/www/estatus-web && npm update
cd /var/www/estatus-web/backend && npm update

# Log rotation (handled automatically)
# SSL certificate renewal (handled automatically by Certbot)
```

### Backup Strategy

```bash
# Create backup script
sudo nano /var/www/estatus-web/backup.sh
```

**Backup Script:**
```bash
#!/bin/bash

BACKUP_DIR="/var/backups/estatus-web"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C /var/www estatus-web

# Backup PM2 configuration
pm2 save > /dev/null
cp ~/.pm2/dump.pm2 $BACKUP_DIR/pm2_$DATE.dump

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.dump" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/app_$DATE.tar.gz"
```

## Final Notes

- Your monitoring application will be accessible at `https://your-domain.com`
- API calls are automatically proxied to the backend Express server
- The setup includes SSL, security headers, and process monitoring
- Regular maintenance and updates are essential for security and performance
- Monitor logs and system resources regularly

For additional support or questions, refer to the project documentation or create an issue in the repository.