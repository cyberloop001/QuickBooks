import { Router, Request, Response } from "express";
import { query, validationResult } from "express-validator";
import { GenesysService } from "../services/GenesysService";
import { logger } from "../utils/logger";

const router = Router();
const genesysService = new GenesysService();

/**
 * GET /genesys/status - Get Genesys Cloud service status
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const status = genesysService.getStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error("Failed to get Genesys Cloud status", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get status",
    });
  }
});

/**
 * POST /genesys/test-connection - Test connection to Genesys Cloud
 */
router.post("/test-connection", async (req: Request, res: Response) => {
  try {
    const isConnected = await genesysService.testConnection();

    res.json({
      success: true,
      data: {
        isConnected,
        message: isConnected
          ? "Successfully connected to Genesys Cloud"
          : "Failed to connect to Genesys Cloud",
      },
    });
  } catch (error) {
    logger.error("Failed to test Genesys Cloud connection", { error });
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to test connection",
    });
  }
});

/**
 * GET /genesys/users - Get users (agents) from Genesys Cloud
 */
router.get(
  "/users",
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { page = 1, limit = 20 } = req.query;
      const pageNum = Number(page);
      const limitNum = Number(limit);

      const result = await genesysService.getUsers(pageNum, limitNum);

      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error("Failed to get Genesys Cloud users", { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get users",
      });
    }
  }
);

/**
 * GET /genesys/queues - Get queues from Genesys Cloud
 */
router.get(
  "/queues",
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { page = 1, limit = 20 } = req.query;
      const pageNum = Number(page);
      const limitNum = Number(limit);

      const result = await genesysService.getQueues(pageNum, limitNum);

      res.json({
        success: true,
        data: result.queues,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error("Failed to get Genesys Cloud queues", { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get queues",
      });
    }
  }
);

/**
 * GET /genesys/call-records - Get call detail records from Genesys Cloud
 */
router.get(
  "/call-records",
  [
    query("startDate")
      .isISO8601()
      .withMessage("Start date must be a valid ISO date"),
    query("endDate")
      .isISO8601()
      .withMessage("End date must be a valid ISO date"),
    query("userIds")
      .optional()
      .isArray()
      .withMessage("User IDs must be an array"),
    query("queueIds")
      .optional()
      .isArray()
      .withMessage("Queue IDs must be an array"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { startDate, endDate, userIds, queueIds } = req.query;

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Validate date range
      if (start >= end) {
        return res.status(400).json({
          success: false,
          error: "Start date must be before end date",
        });
      }

      // Parse optional arrays and ensure they're strings
      const userIdArray = userIds
        ? Array.isArray(userIds)
          ? userIds.map(String)
          : [String(userIds)]
        : undefined;
      const queueIdArray = queueIds
        ? Array.isArray(queueIds)
          ? queueIds.map(String)
          : [String(queueIds)]
        : undefined;

      const callRecords = await genesysService.getCallRecords(
        start,
        end,
        userIdArray,
        queueIdArray
      );

      res.json({
        success: true,
        data: {
          callRecords,
          summary: {
            totalCalls: callRecords.length,
            totalMinutes: Math.round(
              callRecords.reduce((sum, record) => sum + record.duration, 0) / 60
            ),
            dateRange: {
              start: start.toISOString(),
              end: end.toISOString(),
            },
          },
        },
      });
    } catch (error) {
      logger.error("Failed to get Genesys Cloud call records", { error });
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get call records",
      });
    }
  }
);

/**
 * GET /genesys/analytics - Get call analytics from Genesys Cloud
 */
router.get(
  "/analytics",
  [
    query("startDate")
      .isISO8601()
      .withMessage("Start date must be a valid ISO date"),
    query("endDate")
      .isISO8601()
      .withMessage("End date must be a valid ISO date"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { startDate, endDate } = req.query;

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Validate date range
      if (start >= end) {
        return res.status(400).json({
          success: false,
          error: "Start date must be before end date",
        });
      }

      const analytics = await genesysService.getCallAnalytics(start, end);

      res.json({
        success: true,
        data: {
          ...analytics,
          dateRange: {
            start: start.toISOString(),
            end: end.toISOString(),
          },
        },
      });
    } catch (error) {
      logger.error("Failed to get Genesys Cloud analytics", { error });
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get analytics",
      });
    }
  }
);

/**
 * GET /genesys/usage - Get phone usage data for billing (compatible with existing phone system)
 */
router.get(
  "/usage",
  [
    query("startDate")
      .isISO8601()
      .withMessage("Start date must be a valid ISO date"),
    query("endDate")
      .isISO8601()
      .withMessage("End date must be a valid ISO date"),
    query("clientId")
      .optional()
      .isString()
      .withMessage("Client ID must be a string"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { startDate, endDate, clientId } = req.query;

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Validate date range
      if (start >= end) {
        return res.status(400).json({
          success: false,
          error: "Start date must be before end date",
        });
      }

      // Get call records
      const callRecords = await genesysService.getCallRecords(start, end);

      // Convert to billing-compatible format
      const usageData = callRecords.map((record) => ({
        id: record.conversationId,
        clientId: clientId || record.userId || "unknown",
        startTime: record.startTime,
        endTime: record.endTime,
        duration: record.duration, // in seconds
        minutes: Math.ceil(record.duration / 60), // rounded up to nearest minute
        phoneNumber: record.phoneNumber || "unknown",
        direction: record.direction,
        purpose: record.purpose || "billing",
        outcome: record.outcome || "completed",
      }));

      res.json({
        success: true,
        data: {
          usageRecords: usageData,
          summary: {
            totalRecords: usageData.length,
            totalMinutes: usageData.reduce(
              (sum, record) => sum + record.minutes,
              0
            ),
            totalDuration: usageData.reduce(
              (sum, record) => sum + record.duration,
              0
            ),
            dateRange: {
              start: start.toISOString(),
              end: end.toISOString(),
            },
          },
        },
      });
    } catch (error) {
      logger.error("Failed to get Genesys Cloud usage data", { error });
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get usage data",
      });
    }
  }
);

export { router as genesysRoutes };
