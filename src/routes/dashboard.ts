import { Router, Request, Response } from "express";
import { query, validationResult } from "express-validator";
import { getRepository, Repository } from "typeorm";
import { BillingJob, BillingJobStatus } from "../entities/BillingJob";
import { CustomerProfile } from "../entities/CustomerProfile";
import { PhoneUsage } from "../entities/PhoneUsage";
import { GenesysService } from "../services/GenesysService";
import { JobScheduler } from "../jobs/scheduler";
import { logger } from "../utils/logger";
import { config } from "../config";

const router = Router();

// Lazy initialization of services to avoid database connection issues
let genesysService: GenesysService | null = null;
let jobScheduler: JobScheduler | null = null;

const getGenesysService = (): GenesysService => {
  if (!genesysService) {
    genesysService = new GenesysService();
  }
  return genesysService;
};

const getJobScheduler = (): JobScheduler => {
  if (!jobScheduler) {
    jobScheduler = new JobScheduler();
  }
  return jobScheduler;
};

// Lazy initialization of repositories
const getBillingJobRepository = (): Repository<BillingJob> => {
  return getRepository(BillingJob);
};

const getClientRepository = (): Repository<CustomerProfile> => {
  return getRepository(CustomerProfile);
};

const getPhoneUsageRepository = (): Repository<PhoneUsage> => {
  return getRepository(PhoneUsage);
};

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
      getClientRepository().count(),
      getBillingJobRepository().count(),
      getBillingJobRepository().count({
        where: { status: BillingJobStatus.COMPLETED },
      }),
      getBillingJobRepository().count({
        where: { status: BillingJobStatus.FAILED },
      }),
      getBillingJobRepository()
        .createQueryBuilder("job")
        .select("SUM(job.totalInvoices)", "total")
        .getRawOne(),
      getBillingJobRepository()
        .createQueryBuilder("job")
        .select("SUM(job.totalAmount)", "total")
        .getRawOne(),
      getPhoneUsageRepository()
        .createQueryBuilder("usage")
        .select("SUM(usage.billableMinutes)", "totalMinutes")
        .addSelect("COUNT(usage.id)", "totalCalls")
        .addSelect("SUM(usage.amount)", "totalAmount")
        .where("usage.createdAt >= :date", {
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        })
        .getRawOne(),
    ]);

    // Get system status
    const genesysStatus = getGenesysService().getStatus();
    const schedulerStatus = await getJobScheduler().getStatus();

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
          totalAmount: recentUsage?.totalAmount || 0,
        },
        system: {
          genesys: genesysStatus,
          scheduler: schedulerStatus,
          genesysConnected: genesysStatus,
        },
        config: {
          timezone: config.billing.timezone,
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

      const queryBuilder = getBillingJobRepository().createQueryBuilder("job");

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
    const job = await getBillingJobRepository().findOne({
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
 * GET /dashboard/system-status - Get comprehensive system status
 */
router.get("/system-status", async (req: Request, res: Response) => {
  try {
    const [genesysStatus, schedulerStatus] = await Promise.all([
      getGenesysService().getStatus(),
      getJobScheduler().getStatus(),
    ]);

    // Test connections
    const [genesysConnected] = await Promise.all([
      getGenesysService()
        .testConnection()
        .catch(() => false),
    ]);

    // Get company information if QBO is connected
    let companyInfo: any = null;
    // QBO status is now handled separately in QBO routes

    res.json({
      success: true,
      data: {
        genesys: {
          ...genesysStatus,
          connected: genesysConnected,
        },
        scheduler: schedulerStatus,
        overall: {
          healthy:
            genesysConnected && schedulerStatus.billing.totalScheduledJobs > 0,
          issues: [
            !genesysConnected && "Genesys connection failed",
            schedulerStatus.billing.totalScheduledJobs === 0 &&
              "No billing schedules active",
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

      const usageSummary = await getPhoneUsageRepository()
        .createQueryBuilder("usage")
        .select("DATE(usage.startedAt)", "date")
        .addSelect("SUM(usage.billableMinutes)", "totalMinutes")
        .addSelect("COUNT(usage.id)", "totalCalls")
        .addSelect("SUM(usage.amount)", "totalAmount")
        .where("usage.startedAt >= :startDate", { startDate })
        .groupBy("DATE(usage.startedAt)")
        .orderBy("date", "ASC")
        .getRawMany();

      const clientSummary = await getPhoneUsageRepository()
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
