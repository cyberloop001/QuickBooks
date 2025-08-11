import { Router, Request, Response } from "express";
import { PhoneSystemService } from "../services/PhoneSystemService";
import { logger } from "../utils/logger";

const router = Router();
const phoneSystemService = new PhoneSystemService();

/**
 * GET /phone-system/connection/test - Test phone system connection
 */
router.get("/connection/test", async (req: Request, res: Response) => {
  try {
    const isConnected = await phoneSystemService.testConnection();

    res.json({
      success: true,
      data: {
        connected: isConnected,
        message: isConnected
          ? "Phone system connection successful"
          : "Phone system connection failed",
      },
    });
  } catch (error) {
    logger.error("Failed to test phone system connection", { error });
    res.status(500).json({
      success: false,
      error: "Failed to test connection",
    });
  }
});

/**
 * GET /phone-system/usage - Get usage data
 */
router.get("/usage", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, clientId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "Start date and end date are required",
      });
    }

    const usageData = await phoneSystemService.getUsageData(
      new Date(startDate as string),
      new Date(endDate as string),
      clientId as string
    );

    res.json({
      success: true,
      data: {
        usage: usageData,
        totalRecords: usageData.length,
        period: {
          start: startDate,
          end: endDate,
        },
      },
    });
  } catch (error) {
    logger.error("Failed to get usage data", { error });
    res.status(500).json({
      success: false,
      error: "Failed to get usage data",
    });
  }
});

/**
 * GET /phone-system/clients - Get client list
 */
router.get("/clients", async (req: Request, res: Response) => {
  try {
    const clients = await phoneSystemService.getClients();

    res.json({
      success: true,
      data: {
        clients,
        totalClients: clients.length,
      },
    });
  } catch (error) {
    logger.error("Failed to get client list", { error });
    res.status(500).json({
      success: false,
      error: "Failed to get client list",
    });
  }
});

/**
 * GET /phone-system/clients/:id - Get specific client details
 */
router.get("/clients/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const client = await phoneSystemService.getClientDetails(id);

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    logger.error("Failed to get client details", { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: "Failed to get client details",
    });
  }
});

/**
 * GET /phone-system/usage/realtime - Get real-time usage data
 */
router.get("/usage/realtime", async (req: Request, res: Response) => {
  try {
    const usageData = await phoneSystemService.getRealTimeUsage();

    res.json({
      success: true,
      data: {
        usage: usageData,
        totalRecords: usageData.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Failed to get real-time usage data", { error });
    res.status(500).json({
      success: false,
      error: "Failed to get real-time usage data",
    });
  }
});

export { router as phoneSystemRoutes };
