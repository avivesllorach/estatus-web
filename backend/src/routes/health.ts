import { Router, Request, Response } from 'express';
import { PingService } from '../services/pingService';
import { ConfigManager } from '../services/ConfigManager';

export function createHealthRoute(pingService: PingService, configManager?: ConfigManager): Router {
  const router = Router();

  /**
   * Basic health check endpoint
   * GET /health
   */
  router.get('/', (req: Request, res: Response) => {
    try {
      const healthCheck = pingService.getHealthCheck();

      const statusCode = healthCheck.status === 'healthy' ? 200 :
        healthCheck.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        status: healthCheck.status,
        timestamp: new Date().toISOString(),
        uptime: healthCheck.uptime,
        serverCount: healthCheck.serverCount,
        onlinePercentage: healthCheck.onlinePercentage,
        lastConfigChange: healthCheck.lastConfigChange,
        recentGapCount: healthCheck.recentGapCount,
        averagePingTime: healthCheck.averagePingTime,
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Detailed monitoring metrics endpoint
   * GET /health/metrics
   */
  router.get('/metrics', (req: Request, res: Response) => {
    try {
      const metrics = pingService.getMonitoringMetrics();
      const performance = pingService.getMonitoringPerformance();
      const recentGaps = pingService.getMonitoringGaps(20);

      res.status(200).json({
        timestamp: new Date().toISOString(),
        metrics: {
          totalServers: metrics.totalServers,
          onlineServers: metrics.onlineServers,
          offlineServers: metrics.offlineServers,
          onlinePercentage: metrics.totalServers > 0
            ? Math.round((metrics.onlineServers / metrics.totalServers) * 100 * 100) / 100
            : 0,
          lastConfigChange: metrics.lastConfigChange,
          configChangeCount: metrics.configChangeCount,
          averagePingTime: metrics.averagePingTime,
          monitoringUptime: metrics.monitoringUptime,
          uptimeFormatted: formatUptime(metrics.monitoringUptime),
          snmpEnabledCount: metrics.snmpEnabledCount,
          netappEnabledCount: metrics.netappEnabledCount,
          lastStateTransition: metrics.lastStateTransition,
        },
        performance: {
          averageGapDuration: performance.averageGapDuration,
          maxGapDuration: performance.maxGapDuration,
          gapCount: performance.gapCount,
          gapsUnder5Seconds: performance.gapsUnder5Seconds,
          gapsOver5Seconds: performance.gapsOver5Seconds,
          gapsUnder5SecondsPercentage: performance.gapCount > 0
            ? Math.round((performance.gapsUnder5Seconds / performance.gapCount) * 100 * 100) / 100
            : 100,
        },
        recentGaps: recentGaps.map(gap => ({
          serverId: gap.serverId,
          duration: gap.duration,
          startTime: gap.startTime.toISOString(),
          endTime: gap.endTime.toISOString(),
        })),
      });
    } catch (error) {
      res.status(500).json({
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Monitoring continuity report endpoint
   * GET /health/continuity
   */
  router.get('/continuity', (req: Request, res: Response) => {
    try {
      const performance = pingService.getMonitoringPerformance();
      const recentGaps = pingService.getMonitoringGaps(50);
      const healthCheck = pingService.getHealthCheck();

      // Analyze continuity patterns
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const gapsLastHour = recentGaps.filter(gap => gap.endTime > oneHourAgo);
      const gapsLastDay = recentGaps.filter(gap => gap.endTime > oneDayAgo);

      const continuityReport = {
        timestamp: now.toISOString(),
        healthStatus: healthCheck.status,
        uptime: healthCheck.uptime,
        uptimeFormatted: formatUptime(healthCheck.uptime),
        monitoringContinuity: {
          totalGaps: performance.gapCount,
          gapsLastHour: gapsLastHour.length,
          gapsLastDay: gapsLastDay.length,
          averageGapDuration: performance.averageGapDuration,
          maxGapDuration: performance.maxGapDuration,
          gapsUnder5Seconds: performance.gapsUnder5Seconds,
          gapsOver5Seconds: performance.gapsOver5Seconds,
          continuityScore: calculateContinuityScore(performance),
        },
        serviceStatus: {
          totalServers: healthCheck.serverCount,
          onlinePercentage: healthCheck.onlinePercentage,
          averagePingTime: healthCheck.averagePingTime,
          lastConfigChange: healthCheck.lastConfigChange,
        },
        recommendations: generateRecommendations(performance, healthCheck, gapsLastHour),
      };

      res.status(200).json(continuityReport);
    } catch (error) {
      res.status(500).json({
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Calculate monitoring continuity score (0-100)
 */
function calculateContinuityScore(performance: {
  averageGapDuration: number;
  maxGapDuration: number;
  gapCount: number;
  gapsUnder5Seconds: number;
  gapsOver5Seconds: number;
}): number {
  if (performance.gapCount === 0) {
    return 100; // Perfect continuity
  }

  // Base score from percentage of gaps under 5 seconds
  const continuityPercentage = performance.gapCount > 0
    ? (performance.gapsUnder5Seconds / performance.gapCount) * 100
    : 100;

  // Penalty for average gap duration
  const averageGapPenalty = Math.min(performance.averageGapDuration / 10000, 20); // Max 20 point penalty

  // Penalty for maximum gap duration
  const maxGapPenalty = Math.min(performance.maxGapDuration / 30000, 10); // Max 10 point penalty

  // Penalty for gaps over 5 seconds
  const over5SecPenalty = Math.min((performance.gapsOver5Seconds / performance.gapCount) * 30, 30);

  const finalScore = Math.max(0, 100 - averageGapPenalty - maxGapPenalty - over5SecPenalty);

  return Math.round(finalScore * 100) / 100;
}

/**
 * Generate recommendations based on monitoring metrics
 */
function generateRecommendations(
  performance: any,
  healthCheck: any,
  recentGaps: any[],
): string[] {
  const recommendations: string[] = [];

  // High gap count recommendations
  if (performance.gapsOver5Seconds > 2) {
    recommendations.push('Multiple monitoring gaps over 5 seconds detected. Consider optimizing configuration change processing.');
  }

  // Server availability recommendations
  if (healthCheck.onlinePercentage < 80) {
    recommendations.push('Low server availability detected. Check network connectivity and server health.');
  }

  // Ping time recommendations
  if (healthCheck.averagePingTime > 100) {
    recommendations.push('High average ping times detected. Consider network optimization or server location review.');
  }

  // Recent activity recommendations
  if (recentGaps.length > 10) {
    recommendations.push('High number of recent configuration changes detected. Consider batching configuration updates.');
  }

  // Configuration change frequency recommendations
  if (healthCheck.lastConfigChange && (Date.now() - healthCheck.lastConfigChange.getTime()) < 60000) {
    recommendations.push('Recent configuration change detected. Monitor system stability.');
  }

  // No issues
  if (recommendations.length === 0) {
    recommendations.push('Monitoring system is operating normally with excellent continuity.');
  }

  return recommendations;
}