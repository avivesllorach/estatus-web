import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import { PingService } from './services/pingService';
import { ConfigManager } from './services/ConfigManager';
import { createServerRoutes } from './routes/servers';
import { createEventsRoute } from './routes/events';
import { createConfigRoutes } from './routes/config';
import { ServerConfig } from './types/server';
import { PORT, CORS_ORIGIN, CONFIG_PATHS, isTestMode } from './config/constants';

class ServerMonitoringApp {
  private app: express.Application;
  private pingService!: PingService;
  private configManager!: ConfigManager;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupErrorHandling();
  }

  /**
   * Start the application - needs to be async for service initialization
   */
  public async start(): Promise<void> {
    await this.initializeServices();

    this.app.listen(PORT, () => {
      console.log(`🚀 Server monitoring API started on port ${PORT}`);
      console.log(`📊 Monitoring ${this.pingService.getServerCount()} servers`);
      console.log(`🌐 CORS enabled for: ${CORS_ORIGIN}`);
      console.log(`💓 Health check: http://localhost:${PORT}/health`);
      console.log(`📡 API endpoints: http://localhost:${PORT}/api/servers`);
      console.log(`🔄 Real-time events: http://localhost:${PORT}/api/events`);
      console.log('🔧 Hot-reload configuration management enabled');
    });
  }

  private setupMiddleware(): void {
    // CORS configuration
    this.app.use(cors({
      origin: CORS_ORIGIN,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
      credentials: true,
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

  private async initializeServices(): Promise<void> {
    try {
      console.log('🔧 Initializing services...');

      // Initialize ConfigManager
      this.configManager = new ConfigManager();

      // Load initial configurations
      const servers = await this.configManager.loadInitialServers();
      const groups = await this.configManager.loadInitialGroups();

      // Initialize PingService with loaded servers
      this.pingService = new PingService(servers);

      // Set up hot-reload event listeners
      this.setupHotReloadListeners();

      // Start monitoring
      this.pingService.start();

      // Set up routes after services are initialized
      this.setupRoutes();

      console.log('✅ Services initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      process.exit(1);
    }
  }

  /**
   * Set up event listeners for hot-reload functionality
   */
  private setupHotReloadListeners(): void {
    // Listen for server configuration changes
    this.configManager.on('servers-changed', async (event) => {
      console.log(`🔄 Processing server configuration change with ${event.delta.added.length} added, ${event.delta.removed.length} removed, ${event.delta.updated.length} updated`);

      try {
        // Update PingService with new server configuration
        await this.pingService.onConfigChange(event.servers);

        console.log('✅ PingService updated with new configuration');
      } catch (error) {
        console.error('❌ Failed to update PingService with configuration change:', error);
      }
    });

    // Listen for group configuration changes
    this.configManager.on('groups-changed', (event) => {
      console.log(`🔄 Groups configuration updated with ${event.groups.length} groups`);

      // Group changes don't require PingService updates since PingService only handles server monitoring
      // The frontend will receive group changes via SSE events
    });

    // Listen for configuration errors
    this.configManager.on('config-error', (event) => {
      console.error(`❌ Configuration error (${event.type}): ${event.error}`);
    });

    console.log('🔗 Hot-reload event listeners configured');
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        serverCount: this.pingService.getServerCount(),
        onlineCount: this.pingService.getOnlineCount(),
      });
    });

    // API routes
    this.app.use('/api/servers', createServerRoutes(this.pingService));
    this.app.use('/api/events', createEventsRoute(this.pingService, this.configManager));
    this.app.use('/api/config', createConfigRoutes(this.configManager));

    // 404 handler for unknown routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found',
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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
}

// Start the application
const app = new ServerMonitoringApp();
app.start().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});