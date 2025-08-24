import { Router, Request, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { BillingService } from "../services/BillingService";
import { JobScheduler } from "../jobs/scheduler";
import { logger } from "../utils/logger";
import moment from "moment-timezone";
import { config } from "../config";
import { BillingJobStatus, BillingJobType } from "../entities/BillingJob";

const router = Router();
const billingService = new BillingService();
const jobScheduler = new JobScheduler();

/**
 * GET /billing/jobs - Get all billing jobs
 */
router.get("/jobs", async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status, type, customerProfileId } = req.query;

    // Parse and validate query parameters
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit as string) || 20)
    );

    // Validate status if provided
    let validStatus: BillingJobStatus | undefined;
    if (
      status &&
      Object.values(BillingJobStatus).includes(status as BillingJobStatus)
    ) {
      validStatus = status as BillingJobStatus;
    }

    // Validate type if provided
    let validType: BillingJobType | undefined;
    if (
      type &&
      Object.values(BillingJobType).includes(type as BillingJobType)
    ) {
      validType = type as BillingJobType;
    }

    // Fetch billing jobs from service
    const result = await billingService.getBillingJobs({
      page: pageNum,
      limit: limitNum,
      status: validStatus,
      type: validType,
      customerProfileId: customerProfileId as string,
    });

    res.json({
      success: true,
      data: result.jobs,
      pagination: result.pagination,
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

      // Fetch the specific job from service
      const job = await billingService.getBillingJob(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: "Billing job not found",
        });
      }

      res.json({
        success: true,
        data: job,
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
    body("billingPeriodStart")
      .isString()
      .notEmpty()
      .withMessage("Start date is required")
      .custom((value) => {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error("Start date must be a valid date");
        }
        return date;
      }),
    body("billingPeriodEnd")
      .isString()
      .notEmpty()
      .withMessage("End date is required")
      .custom((value, { req }) => {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error("End date must be a valid date");
        }

        // Check if end date is after start date
        const startDate = new Date(req.body.billingPeriodStart);
        if (date <= startDate) {
          throw new Error("End date must be after start date");
        }

        return date;
      }),
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

      const {
        billingPeriodStart,
        billingPeriodEnd,
        clientId,
        isDryRun = false,
      } = req.body;

      logger.info("Manual billing job requested", {
        billingPeriodStart,
        billingPeriodEnd,
        startDateType: typeof billingPeriodStart,
        endDateType: typeof billingPeriodEnd,
        clientId,
        isDryRun,
      });

      // Convert string dates to Date objects if they aren't already
      const startDate =
        billingPeriodStart instanceof Date
          ? billingPeriodStart
          : new Date(billingPeriodStart);
      const endDate =
        billingPeriodEnd instanceof Date
          ? billingPeriodEnd
          : new Date(billingPeriodEnd);

      // Validate the converted dates
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: "Invalid start date format",
        });
      }

      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: "Invalid end date format",
        });
      }

      logger.info("Converted dates", {
        originalStartDate: billingPeriodStart,
        originalEndDate: billingPeriodEnd,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
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
        error:
          error instanceof Error ? error.message : "Failed to run billing job",
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
        error:
          error instanceof Error
            ? error.message
            : "Failed to run previous month billing job",
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

      // Retry the job using the service
      const result = await billingService.retryBillingJob(jobId);

      res.json({
        success: true,
        message: `Retry initiated for job ${jobId}`,
        data: result,
      });
    } catch (error) {
      logger.error("Failed to retry billing job", {
        error,
        jobId: req.params.jobId,
      });
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to retry billing job",
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

      // Cancel the job using the service
      await billingService.cancelBillingJob(jobId);

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
        error:
          error instanceof Error
            ? error.message
            : "Failed to cancel billing job",
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
    const schedulerStatus = jobScheduler.getStatus();

    res.json({
      success: true,
      data: {
        scheduler: schedulerStatus,
        lastRun: new Date().toISOString(),
        nextRun:
          schedulerStatus.billing.scheduledJobs.length > 0
            ? schedulerStatus.billing.scheduledJobs[0].nextRun.toISOString()
            : null,
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
