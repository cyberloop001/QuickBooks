import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { config } from "../config";

export function killSwitchMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip kill switch for health checks and system endpoints
  if (
    req.path === "/health" ||
    req.path === "/api/v1/health" ||
    req.path === "/api/v1/system/kill-switch"
  ) {
    return next();
  }

  // Check if kill switch is enabled
  if (config.killSwitch.enabled) {
    logger.warn("Request blocked by kill switch", {
      path: req.path,
      method: req.method,
      ip: req.ip,
      reason: config.killSwitch.reason || "Kill switch activated",
    });

    res.status(503).json({
      success: false,
      error: {
        message: "System temporarily unavailable",
        code: "KILL_SWITCH_ACTIVE",
        reason: config.killSwitch.reason || "System maintenance in progress",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  next();
}

// Helper function to enable kill switch
export function enableKillSwitch(reason: string = "System maintenance"): void {
  process.env.KILL_SWITCH_ENABLED = "true";
  process.env.KILL_SWITCH_REASON = reason;

  logger.warn("Kill switch enabled", { reason });
}

// Helper function to disable kill switch
export function disableKillSwitch(): void {
  process.env.KILL_SWITCH_ENABLED = "false";
  process.env.KILL_SWITCH_REASON = "";

  logger.info("Kill switch disabled");
}

// Helper function to get kill switch status
export function getKillSwitchStatus(): { enabled: boolean; reason: string } {
  return {
    enabled: config.killSwitch.enabled,
    reason: config.killSwitch.reason || "",
  };
}
