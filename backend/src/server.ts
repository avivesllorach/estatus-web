import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import { PingService } from './services/pingService';
import { createServerRoutes } from './routes/servers';
import { createEventsRoute } from './routes/events';
import configRoutes from './routes/config';
import { ServerConfig } from './types/server';
import { PORT, CORS_ORIGIN, CONFIG_PATHS, isTestMode } from './config/constants';

class ServerMonitoringApp {
  private app: express.Application;
  private pingService!: PingService;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.loadServers();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // CORS configuration
    this.app.use(cors({
      origin: CORS_ORIGIN,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
      credentials: true
    }));

    // Body parsing middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private loadServers(): void {
    try {
      const serversPath = CONFIG_PATHS.servers;
      const serversData = fs.readFileSync(serversPath, 'utf8');
      const servers: ServerConfig[] = JSON.parse(serversData);

      if (isTestMode()) {
        console.log(`[TEST MODE] Loaded ${servers.length} servers from ${serversPath}`);
      } else {
        console.log(`Loaded ${servers.length} servers from configuration`);
      }

      // Initialize ping service with loaded servers
      this.pingService = new PingService(servers);

      // Start monitoring
      this.pingService.start();
    } catch (error) {
      console.error('Failed to load servers configuration:', error);
      process.exit(1);
    }
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        serverCount: this.pingService.getServerCount(),
        onlineCount: this.pingService.getOnlineCount()
      });
    });

    // API routes
    this.app.use('/api/servers', createServerRoutes(this.pingService));
    this.app.use('/api/events', createEventsRoute(this.pingService));
    this.app.use('/api/config', configRoutes);

    // 404 handler for unknown routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down gracefully...');
      this.shutdown();
    });
  }

  private shutdown(): void {
    console.log('Stopping ping service...');
    if (this.pingService) {
      this.pingService.stop();
    }
    process.exit(0);
  }

  public start(): void {
    this.app.listen(PORT, () => {
      console.log(`🚀 Server monitoring API started on port ${PORT}`);
      console.log(`📊 Monitoring ${this.pingService.getServerCount()} servers`);
      console.log(`🌐 CORS enabled for: ${CORS_ORIGIN}`);
      console.log(`💓 Health check: http://localhost:${PORT}/health`);
      console.log(`📡 API endpoints: http://localhost:${PORT}/api/servers`);
      console.log(`🔄 Real-time events: http://localhost:${PORT}/api/events`);
    });
  }
}

// Start the application
const app = new ServerMonitoringApp();
app.start();