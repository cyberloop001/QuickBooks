import { Router, Request, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { BillingService } from "../services/BillingService";
import { jobScheduler } from "../jobs/scheduler";
import { logger } from "../utils/logger";
import moment from "moment-timezone";
import { config } from "../config";

const router = Router();
const billingService = new BillingService();

/**
 * GET /billing/jobs - Get all billing jobs
 */
router.get("/jobs", async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status, type, clientId } = req.query;

    // This would typically use a repository to fetch jobs
    // For now, return a placeholder response
    res.json({
      success: true,
      data: [],
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: 0,
        pages: 0,
      },
    });
  } catch (error) {
    logger.error("Failed to get billing jobs", { error });
    res.status(500).json({
      success: false,
      error: "Failed to get billing jobs",
    });
  }
});

/**
 * GET /billing/jobs/:jobId - Get specific billing job
 */
router.get(
  "/jobs/:jobId",
  param("jobId").isString().notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { jobId } = req.params;

      // This would fetch the specific job from database
      res.json({
        success: true,
        data: {
          jobId,
          status: "completed",
          // Other job details would go here
        },
      });
    } catch (error) {
      logger.error("Failed to get billing job", {
        error,
        jobId: req.params.jobId,
      });
      res.status(500).json({
        success: false,
        error: "Failed to get billing job",
      });
    }
  }
);

/**
 * POST /billing/run - Run billing job manually
 */
router.post(
  "/run",
  [
    body("startDate").isISO8601().toDate(),
    body("endDate").isISO8601().toDate(),
    body("clientId").optional().isString(),
    body("isDryRun").optional().isBoolean(),
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

      const { startDate, endDate, clientId, isDryRun = false } = req.body;

      logger.info("Manual billing job requested", {
        startDate,
        endDate,
        clientId,
        isDryRun,
      });

      const result = await billingService.runBillingJob(
        startDate,
        endDate,
        clientId,
        isDryRun
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Manual billing job failed", { error });
      res.status(500).json({
        success: false,
        error: error.message || "Failed to run billing job",
      });
    }
  }
);

/**
 * POST /billing/run-monthly - Run monthly billing for specific month
 */
router.post(
  "/run-monthly",
  [
    body("year").isInt({ min: 2020, max: 2030 }),
    body("month").isInt({ min: 1, max: 12 }),
    body("clientId").optional().isString(),
    body("isDryRun").optional().isBoolean(),
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

      const { year, month, clientId, isDryRun = false } = req.body;

      logger.info("Monthly billing job requested", {
        year,
        month,
        clientId,
        isDryRun,
      });

      const result = await jobScheduler.runBillingJobForPeriod(
        year,
        month,
        clientId,
        isDryRun
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Monthly billing job failed", { error });
      res.status(500).json({
        success: false,
        error: error.message || "Failed to run monthly billing job",
      });
    }
  }
);

/**
 * POST /billing/run-previous-month - Run billing for previous month
 */
router.post(
  "/run-previous-month",
  [
    body("clientId").optional().isString(),
    body("isDryRun").optional().isBoolean(),
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

      const { clientId, isDryRun = false } = req.body;

      // Calculate previous month
      const now = moment().tz(config.billing.timezone);
      const previousMonth = now.clone().subtract(1, "month");

      const startDate = previousMonth.clone().startOf("month").toDate();
      const endDate = previousMonth.clone().endOf("month").toDate();

      logger.info("Previous month billing job requested", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        clientId,
        isDryRun,
      });

      const result = await billingService.runBillingJob(
        startDate,
        endDate,
        clientId,
        isDryRun
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Previous month billing job failed", { error });
      res.status(500).json({
        success: false,
        error: error.message || "Failed to run previous month billing job",
      });
    }
  }
);

/**
 * POST /billing/retry/:jobId - Retry failed billing job
 */
router.post(
  "/retry/:jobId",
  param("jobId").isString().notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { jobId } = req.params;

      logger.info("Retry billing job requested", { jobId });

      // This would fetch the job details and retry it
      // For now, return a placeholder response
      res.json({
        success: true,
        message: `Retry initiated for job ${jobId}`,
        data: { jobId },
      });
    } catch (error) {
      logger.error("Failed to retry billing job", {
        error,
        jobId: req.params.jobId,
      });
      res.status(500).json({
        success: false,
        error: "Failed to retry billing job",
      });
    }
  }
);

/**
 * DELETE /billing/jobs/:jobId - Cancel billing job
 */
router.delete(
  "/jobs/:jobId",
  param("jobId").isString().notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { jobId } = req.params;

      logger.info("Cancel billing job requested", { jobId });

      // This would cancel the job in the database
      // For now, return a placeholder response
      res.json({
        success: true,
        message: `Job ${jobId} cancelled successfully`,
        data: { jobId },
      });
    } catch (error) {
      logger.error("Failed to cancel billing job", {
        error,
        jobId: req.params.jobId,
      });
      res.status(500).json({
        success: false,
        error: "Failed to cancel billing job",
      });
    }
  }
);

/**
 * GET /billing/summary - Get billing summary
 */
router.get(
  "/summary",
  [
    query("startDate").optional().isISO8601().toDate(),
    query("endDate").optional().isISO8601().toDate(),
    query("clientId").optional().isString(),
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

      // This would fetch billing summary from database
      // For now, return a placeholder response
      res.json({
        success: true,
        data: {
          period: {
            start: startDate || new Date(),
            end: endDate || new Date(),
          },
          totalClients: 0,
          totalCalls: 0,
          totalMinutes: 0,
          totalAmount: 0,
          invoicesCreated: 0,
          invoicesFailed: 0,
        },
      });
    } catch (error) {
      logger.error("Failed to get billing summary", { error });
      res.status(500).json({
        success: false,
        error: "Failed to get billing summary",
      });
    }
  }
);

/**
 * GET /billing/status - Get billing system status
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const schedulerStatus = jobScheduler.getJobStatus();

    res.json({
      success: true,
      data: {
        scheduler: schedulerStatus,
        lastRun: new Date().toISOString(),
        nextRun: schedulerStatus.nextRun,
        timezone: config.billing.timezone,
      },
    });
  } catch (error) {
    logger.error("Failed to get billing status", { error });
    res.status(500).json({
      success: false,
      error: "Failed to get billing status",
    });
  }
});

export { router as billingRoutes };
