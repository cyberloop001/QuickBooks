import { Router, Request, Response } from "express";
import { logger } from "../utils/logger";
import { config } from "../config";

const router = Router();

/**
 * GET /health - Basic health check
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.server.environment,
      version: "1.0.0",
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error("Health check failed", { error });
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * GET /health/detailed - Detailed health check
 */
router.get("/detailed", async (req: Request, res: Response) => {
  try {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.server.environment,
      version: "1.0.0",
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
      services: {
        database: "unknown",
        qbo: "unknown",
        phoneSystem: "unknown",
      },
      config: {
        database: {
          host: config.database.host,
          port: config.database.port,
          name: config.database.name,
        },
        qbo: {
          environment: config.qbo.environment,
          clientId: config.qbo.clientId ? "configured" : "not configured",
        },
        phoneSystem: {
          baseUrl: config.phoneSystem.baseUrl ? "configured" : "not configured",
        },
      },
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error("Detailed health check failed", { error });
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * GET /health/ready - Readiness probe
 */
router.get("/ready", async (req: Request, res: Response) => {
  try {
    // Check if system is ready to accept requests
    const ready = true; // This would check database connections, etc.

    if (ready) {
      res.status(200).json({
        status: "ready",
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: "not ready",
        timestamp: new Date().toISOString(),
        reason: "System not ready",
      });
    }
  } catch (error) {
    logger.error("Readiness check failed", { error });
    res.status(503).json({
      status: "not ready",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * GET /health/live - Liveness probe
 */
router.get("/live", async (req: Request, res: Response) => {
  try {
    // Check if system is alive
    const alive = true; // This would check basic system health

    if (alive) {
      res.status(200).json({
        status: "alive",
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: "not alive",
        timestamp: new Date().toISOString(),
        reason: "System not alive",
      });
    }
  } catch (error) {
    logger.error("Liveness check failed", { error });
    res.status(503).json({
      status: "not alive",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

export { router as healthRoutes };
