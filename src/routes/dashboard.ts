import { Router, Request, Response } from "express";
import { query, validationResult } from "express-validator";
import { getRepository } from "typeorm";
import { BillingJob, BillingJobStatus } from "../entities/BillingJob";
import { Client } from "../entities/Client";
import { PhoneUsage } from "../entities/PhoneUsage";
import { QBOService } from "../services/QBOService";
import { GenesysService } from "../services/GenesysService";
import { JobScheduler } from "../jobs/scheduler";
import { logger } from "../utils/logger";
import { config } from "../config";

const router = Router();
const qboService = new QBOService();
const genesysService = new GenesysService();
const jobScheduler = new JobScheduler();

/**
 * GET /dashboard/overview - Get system overview and key metrics
 */
router.get("/overview", async (req: Request, res: Response) => {
  try {
    const [
      totalClients,
      totalBillingJobs,
      successfulJobs,
      failedJobs,
      totalInvoices,
      totalRevenue,
      recentUsage,
    ] = await Promise.all([
      getRepository(Client).count(),
      getRepository(BillingJob).count(),
      getRepository(BillingJob).count({
        where: { status: BillingJobStatus.COMPLETED },
      }),
      getRepository(BillingJob).count({
        where: { status: BillingJobStatus.FAILED },
      }),
      getRepository(BillingJob)
        .createQueryBuilder("job")
        .select("SUM(job.totalInvoices)", "total")
        .getRawOne(),
      getRepository(BillingJob)
        .createQueryBuilder("job")
        .select("SUM(job.totalAmount)", "total")
        .getRawOne(),
      getRepository(PhoneUsage)
        .createQueryBuilder("usage")
        .select("SUM(usage.billableMinutes)", "totalMinutes")
        .addSelect("COUNT(usage.id)", "totalCalls")
        .where("usage.createdAt >= :date", {
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        })
        .getRawOne(),
    ]);

    // Get system status
    const qboStatus = qboService.getTokenStatus();
    const genesysStatus = genesysService.getStatus();
    const schedulerStatus = jobScheduler.getStatus();

    res.json({
      success: true,
      data: {
        clients: {
          total: totalClients,
        },
        billing: {
          totalJobs: totalBillingJobs,
          successfulJobs,
          failedJobs,
          totalInvoices: totalInvoices?.total || 0,
          totalRevenue: totalRevenue?.total || 0,
        },
        usage: {
          totalMinutes: recentUsage?.totalMinutes || 0,
          totalCalls: recentUsage?.totalCalls || 0,
        },
        system: {
          qbo: qboStatus,
          genesys: genesysStatus,
          scheduler: schedulerStatus,
        },
        config: {
          timezone: config.billing.timezone,
          ratePerMinute: config.billing.ratePerMinute,
          currency: config.billing.currency,
        },
      },
    });
  } catch (error) {
    logger.error("Failed to get dashboard overview", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get overview",
    });
  }
});

/**
 * GET /dashboard/billing-jobs - Get billing job history
 */
router.get(
  "/billing-jobs",
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("status")
      .optional()
      .isIn(Object.values(BillingJobStatus))
      .withMessage("Invalid status"),
    query("startDate")
      .optional()
      .isISO8601()
      .withMessage("Start date must be a valid ISO date"),
    query("endDate")
      .optional()
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

      const { page = 1, limit = 20, status, startDate, endDate } = req.query;

      const queryBuilder = getRepository(BillingJob).createQueryBuilder("job");

      // Add filters
      if (status) {
        queryBuilder.andWhere("job.status = :status", { status });
      }

      if (startDate) {
        queryBuilder.andWhere("job.createdAt >= :startDate", { startDate });
      }

      if (endDate) {
        queryBuilder.andWhere("job.createdAt <= :endDate", { endDate });
      }

      // Get total count
      const total = await queryBuilder.getCount();

      // Get paginated results
      const jobs = await queryBuilder
        .orderBy("job.createdAt", "DESC")
        .skip((Number(page) - 1) * Number(limit))
        .take(Number(limit))
        .getMany();

      res.json({
        success: true,
        data: {
          jobs,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      logger.error("Failed to get billing jobs", { error });
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get billing jobs",
      });
    }
  }
);

/**
 * GET /dashboard/billing-jobs/:id - Get specific billing job details
 */
router.get("/billing-jobs/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await getRepository(BillingJob).findOne({
      where: { id },
      relations: ["clientBillingResults"],
    });

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
    logger.error("Failed to get billing job details", {
      error,
      jobId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get job details",
    });
  }
});

/**
 * POST /dashboard/billing-jobs/run - Run manual billing job
 */
router.post(
  "/billing-jobs/run",
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
    query("isDryRun")
      .optional()
      .isBoolean()
      .withMessage("isDryRun must be a boolean"),
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

      const { startDate, endDate, clientId, isDryRun = false } = req.query;

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Validate date range
      if (start >= end) {
        return res.status(400).json({
          success: false,
          error: "Start date must be before end date",
        });
      }

      const result = await jobScheduler.runManualBilling(
        start,
        end,
        clientId as string,
        isDryRun as boolean
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Failed to run manual billing job", { error });
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to run billing job",
      });
    }
  }
);

/**
 * GET /dashboard/system-status - Get comprehensive system status
 */
router.get("/system-status", async (req: Request, res: Response) => {
  try {
    const [qboStatus, genesysStatus, schedulerStatus] = await Promise.all([
      qboService.getTokenStatus(),
      genesysService.getStatus(),
      jobScheduler.getStatus(),
    ]);

    // Test connections
    const [qboConnected, genesysConnected] = await Promise.all([
      qboService.testConnection().catch(() => false),
      genesysService.testConnection().catch(() => false),
    ]);

    // Get company information if QBO is connected
    let companyInfo: any = null;
    if (qboConnected) {
      try {
        companyInfo = await qboService.getCompanyInfo();
      } catch (error) {
        logger.warn("Failed to get company info for system status", { error });
      }
    }

    res.json({
      success: true,
      data: {
        qbo: {
          ...qboStatus,
          connected: qboConnected,
          companyName: companyInfo?.CompanyName,
          environment: config.qbo.environment,
        },
        genesys: {
          ...genesysStatus,
          connected: genesysConnected,
        },
        scheduler: schedulerStatus,
        overall: {
          healthy:
            qboConnected &&
            genesysConnected &&
            schedulerStatus.billing.isSchedulerActive,
          issues: [
            !qboConnected && "QBO connection failed",
            !genesysConnected && "Genesys connection failed",
            !schedulerStatus.billing.isSchedulerActive &&
              "Scheduler not active",
          ].filter(Boolean),
        },
      },
    });
  } catch (error) {
    logger.error("Failed to get system status", { error });
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get system status",
    });
  }
});

/**
 * POST /dashboard/system-status/test - Test system connections
 */
router.post("/system-status/test", async (req: Request, res: Response) => {
  try {
    const [qboTest, genesysTest, schedulerTest] = await Promise.all([
      qboService.testConnection(),
      genesysService.testConnection(),
      jobScheduler.testBillingScheduler(),
    ]);

    res.json({
      success: true,
      data: {
        qbo: qboTest,
        genesys: genesysTest,
        scheduler: schedulerTest,
        overall: qboTest && genesysTest && schedulerTest,
      },
    });
  } catch (error) {
    logger.error("Failed to test system connections", { error });
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to test connections",
    });
  }
});

/**
 * GET /dashboard/usage-summary - Get usage summary for dashboard
 */
router.get(
  "/usage-summary",
  [
    query("days")
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage("Days must be between 1 and 365"),
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

      const days = Number(req.query.days) || 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const usageSummary = await getRepository(PhoneUsage)
        .createQueryBuilder("usage")
        .select("DATE(usage.startedAt)", "date")
        .addSelect("SUM(usage.billableMinutes)", "totalMinutes")
        .addSelect("COUNT(usage.id)", "totalCalls")
        .addSelect("SUM(usage.amount)", "totalAmount")
        .where("usage.startedAt >= :startDate", { startDate })
        .groupBy("DATE(usage.startedAt)")
        .orderBy("date", "ASC")
        .getRawMany();

      const clientSummary = await getRepository(PhoneUsage)
        .createQueryBuilder("usage")
        .select("usage.clientId", "clientId")
        .addSelect("SUM(usage.billableMinutes)", "totalMinutes")
        .addSelect("COUNT(usage.id)", "totalCalls")
        .addSelect("SUM(usage.amount)", "totalAmount")
        .where("usage.startedAt >= :startDate", { startDate })
        .groupBy("usage.clientId")
        .orderBy("totalAmount", "DESC")
        .limit(10)
        .getRawMany();

      res.json({
        success: true,
        data: {
          period: {
            startDate: startDate.toISOString(),
            endDate: new Date().toISOString(),
            days,
          },
          dailyUsage: usageSummary,
          topClients: clientSummary,
        },
      });
    } catch (error) {
      logger.error("Failed to get usage summary", { error });
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get usage summary",
      });
    }
  }
);

export { router as dashboardRoutes };
