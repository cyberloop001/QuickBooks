import { Router, Request, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { BillingService } from "../services/BillingService";
import { JobScheduler } from "../jobs/scheduler";
import { logger } from "../utils/logger";
import moment from "moment-timezone";
import { config } from "../config";
import { BillingJobStatus, BillingJobType } from "../entities/BillingJob";
import { getRepository } from "typeorm";
import { CustomerProfile } from "../entities/CustomerProfile";

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
 * POST /billing/run - Run billing job manually for all queues
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
        isDryRun = false,
      } = req.body;

      logger.info("Manual billing job requested for all queues", {
        billingPeriodStart,
        billingPeriodEnd,
        startDateType: typeof billingPeriodStart,
        endDateType: typeof billingPeriodEnd,
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

      // Get all active customer profiles and their associated queues
      const customerProfileRepo = getRepository(CustomerProfile);
      const activeCustomers = await customerProfileRepo.find({
        where: { isActive: true },
        select: ["id", "qboDisplayName", "qboCompanyName", "genesysQueueNames"],
      });

      if (activeCustomers.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No active customer profiles found",
        });
      }

      logger.info(`Found ${activeCustomers.length} active customer profiles`);

      // Extract all unique queues from customer profiles
      const allQueues = new Set<string>();
      const customerQueueMap = new Map<string, string[]>();

      for (const customer of activeCustomers) {
        if (
          customer.genesysQueueNames &&
          customer.genesysQueueNames.length > 0
        ) {
          customer.genesysQueueNames.forEach((queueName) => {
            if (queueName && queueName.trim() !== "") {
              allQueues.add(queueName.trim());
            }
          });
          customerQueueMap.set(customer.id, customer.genesysQueueNames);
        }
      }

      const uniqueQueues = Array.from(allQueues);

      if (uniqueQueues.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No queues found in customer profiles",
        });
      }

      logger.info(
        `Found ${
          uniqueQueues.length
        } unique queues from customer profiles: ${uniqueQueues.join(", ")}`
      );

      // Run billing job for each queue
      const queueResults: Array<{
        queueName: string;
        customerIds: string[];
        success: boolean;
        result: any;
      }> = [];
      const queueErrors: Array<{
        queueName: string;
        customerIds: string[];
        error: string;
      }> = [];

      for (const queueName of uniqueQueues) {
        try {
          logger.info(`Running billing job for queue: ${queueName}`);

          const result = await billingService.runBillingJob(
            startDate,
            endDate,
            queueName, // Pass queue name instead of client ID
            isDryRun
          );

          // Find which customers use this queue
          const customerIds = Array.from(customerQueueMap.entries())
            .filter(([_, queues]) => queues.includes(queueName))
            .map(([customerId, _]) => customerId);

          queueResults.push({
            queueName,
            customerIds,
            success: true,
            result,
          });

          logger.info(`Billing job completed for queue: ${queueName}`, {
            jobId: result.jobId,
            totalQueues: result.totalQueues,
            totalInvoices: result.totalInvoices,
            totalAmount: result.totalAmount,
            customerIds,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.error(`Billing job failed for queue: ${queueName}`, { error });

          // Find which customers use this queue
          const customerIds = Array.from(customerQueueMap.entries())
            .filter(([_, queues]) => queues.includes(queueName))
            .map(([customerId, _]) => customerId);

          queueErrors.push({
            queueName,
            customerIds,
            error: errorMessage,
          });
        }
      }

      // Calculate overall results
      const totalQueues = uniqueQueues.length;
      const successfulQueues = queueResults.length;
      const failedQueues = queueErrors.length;
      const totalInvoices = queueResults.reduce(
        (sum, qr) => sum + qr.result.totalInvoices,
        0
      );
      const totalAmount = queueResults.reduce(
        (sum, qr) => sum + qr.result.totalAmount,
        0
      );

      const overallResult = {
        success: true,
        summary: {
          totalQueues,
          successfulQueues,
          failedQueues,
          totalInvoices,
          totalAmount,
        },
        queueResults,
        errors: queueErrors,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        isDryRun,
      };

      res.json({
        success: true,
        data: overallResult,
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
    const schedulerStatus = await jobScheduler.getStatus();

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
