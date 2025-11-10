import { Router, Request, Response } from 'express';
import { PingService } from '../services/pingService';
import { StatusUpdate, DiskUpdate } from '../types/server';

export function createEventsRoute(pingService: PingService): Router {
  const router = Router();

  // Server-Sent Events endpoint for real-time updates
  router.get('/', (req: Request, res: Response) => {
    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write('data: {"type":"connected","message":"Connected to server status stream"}\n\n');

    // Send current status of all servers
    const servers = pingService.getAllServerStatus();
    res.write(`data: ${JSON.stringify({
      type: 'initial',
      servers: servers
    })}\n\n`);

    // Listen for status changes
    const onStatusChange = (statusUpdate: StatusUpdate) => {
      res.write(`data: ${JSON.stringify({
        type: 'statusChange',
        update: statusUpdate
      })}\n\n`);
    };

    // Listen for disk updates
    const onDiskUpdate = (diskUpdate: DiskUpdate) => {
      res.write(`data: ${JSON.stringify({
        type: 'diskUpdate',
        update: diskUpdate
      })}\n\n`);
    };

    // Listen for ping service events
    pingService.on('statusChange', onStatusChange);
    pingService.on('diskUpdate', onDiskUpdate);

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeat = setInterval(() => {
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      })}\n\n`);
    }, 30000);

    // Handle client disconnect
    req.on('close', () => {
      console.log('SSE client disconnected');
      pingService.removeListener('statusChange', onStatusChange);
      pingService.removeListener('diskUpdate', onDiskUpdate);
      clearInterval(heartbeat);
    });

    req.on('error', (error) => {
      console.error('SSE connection error:', error);
      pingService.removeListener('statusChange', onStatusChange);
      pingService.removeListener('diskUpdate', onDiskUpdate);
      clearInterval(heartbeat);
    });
  });

  return router;
}