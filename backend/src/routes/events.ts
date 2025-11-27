import { Router, Request, Response } from 'express';
import { PingService } from '../services/pingService';
import { ConfigManager } from '../services/ConfigManager';
import { StatusUpdate, DiskUpdate } from '../types/server';

export function createEventsRoute(pingService: PingService, configManager?: ConfigManager): Router {
  const router = Router();

  // Server-Sent Events endpoint for real-time updates
  router.get('/', (req: Request, res: Response) => {
    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Send initial connection message
    res.write('data: {"type":"connected","message":"Connected to server status stream"}\n\n');

    // Send current status of all servers
    const servers = pingService.getAllServerStatus();
    res.write(`data: ${JSON.stringify({
      type: 'initial',
      servers,
    })}\n\n`);

    // Listen for status changes
    const onStatusChange = (statusUpdate: StatusUpdate) => {
      res.write(`data: ${JSON.stringify({
        type: 'statusChange',
        update: statusUpdate,
      })}\n\n`);
    };

    // Listen for disk updates
    const onDiskUpdate = (diskUpdate: DiskUpdate) => {
      res.write(`data: ${JSON.stringify({
        type: 'diskUpdate',
        update: diskUpdate,
      })}\n\n`);
    };

    // Listen for ping service events
    pingService.on('statusChange', onStatusChange);
    pingService.on('diskUpdate', onDiskUpdate);

    // Listen for configuration changes if ConfigManager is provided
    let onServersChanged: ((event: any) => void) | null = null;
    let onServersAdded: ((servers: any[]) => void) | null = null;
    let onServersUpdated: ((servers: any[]) => void) | null = null;
    let onServersRemoved: ((servers: any[]) => void) | null = null;
    let onGroupsChanged: ((event: any) => void) | null = null;

    if (configManager) {
      // Handle general servers-changed event (backward compatibility)
      onServersChanged = (event: any) => {
        res.write(`data: ${JSON.stringify({
          type: 'serversChanged',
          servers: event.servers,
          delta: event.delta,
          timestamp: event.timestamp,
        })}\n\n`);
      };

      // Handle specific server events per AC requirements
      onServersAdded = (servers: any[]) => {
        servers.forEach(server => {
          res.write(`data: ${JSON.stringify({
            type: 'serverAdded',
            server,
          })}\n\n`);
        });
      };

      onServersUpdated = (servers: any[]) => {
        servers.forEach(server => {
          res.write(`data: ${JSON.stringify({
            type: 'serverUpdated',
            server,
          })}\n\n`);
        });
      };

      onServersRemoved = (servers: any[]) => {
        servers.forEach(server => {
          res.write(`data: ${JSON.stringify({
            type: 'serverRemoved',
            serverId: server.id,
          })}\n\n`);
        });
      };

      // Handle groups changed event per AC requirements
      onGroupsChanged = (event: any) => {
        res.write(`data: ${JSON.stringify({
          type: 'groupsChanged',
          groups: event.groups,
        })}\n\n`);
      };

      // Register all event listeners
      configManager.on('servers-changed', onServersChanged);
      configManager.on('servers-added', onServersAdded);
      configManager.on('servers-updated', onServersUpdated);
      configManager.on('servers-removed', onServersRemoved);
      configManager.on('groups-changed', onGroupsChanged);
    }

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeat = setInterval(() => {
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
      })}\n\n`);
    }, 30000);

    // Handle client disconnect
    req.on('close', () => {
      console.log('SSE client disconnected');
      pingService.removeListener('statusChange', onStatusChange);
      pingService.removeListener('diskUpdate', onDiskUpdate);

      // Clean up ConfigManager listeners if they were created
      if (configManager) {
        if (onServersChanged) configManager.removeListener('servers-changed', onServersChanged);
        if (onServersAdded) configManager.removeListener('servers-added', onServersAdded);
        if (onServersUpdated) configManager.removeListener('servers-updated', onServersUpdated);
        if (onServersRemoved) configManager.removeListener('servers-removed', onServersRemoved);
        if (onGroupsChanged) configManager.removeListener('groups-changed', onGroupsChanged);
      }

      clearInterval(heartbeat);
    });

    req.on('error', (error) => {
      console.error('SSE connection error:', error);
      pingService.removeListener('statusChange', onStatusChange);
      pingService.removeListener('diskUpdate', onDiskUpdate);

      // Clean up ConfigManager listeners if they were created
      if (configManager) {
        if (onServersChanged) configManager.removeListener('servers-changed', onServersChanged);
        if (onServersAdded) configManager.removeListener('servers-added', onServersAdded);
        if (onServersUpdated) configManager.removeListener('servers-updated', onServersUpdated);
        if (onServersRemoved) configManager.removeListener('servers-removed', onServersRemoved);
        if (onGroupsChanged) configManager.removeListener('groups-changed', onGroupsChanged);
      }

      clearInterval(heartbeat);
    });
  });

  return router;
}