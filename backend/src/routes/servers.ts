import { Router, Request, Response } from 'express';
import { PingService } from '../services/pingService';
import { ApiResponse, ServerStatus } from '../types/server';

export function createServerRoutes(pingService: PingService): Router {
  const router = Router();

  // Get all servers with their current status
  router.get('/', (req: Request, res: Response) => {
    try {
      const servers = pingService.getAllServerStatus();
      const response: ApiResponse<ServerStatus[]> = {
        success: true,
        data: servers
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<never> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  });

  // Get specific server status
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const serverId = req.params.id;
      const server = pingService.getServerStatus(serverId);
      
      if (!server) {
        const response: ApiResponse<never> = {
          success: false,
          error: 'Server not found'
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse<ServerStatus> = {
        success: true,
        data: server
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<never> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  });

  // Get server statistics
  router.get('/stats/summary', (req: Request, res: Response) => {
    try {
      const totalServers = pingService.getServerCount();
      const onlineServers = pingService.getOnlineCount();
      const offlineServers = totalServers - onlineServers;

      const stats = {
        total: totalServers,
        online: onlineServers,
        offline: offlineServers,
        uptime: totalServers > 0 ? Math.round((onlineServers / totalServers) * 100) : 0
      };

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats
      };
      res.json(response);
    } catch (error) {
      const response: ApiResponse<never> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  });

  return router;
}