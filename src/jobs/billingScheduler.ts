import { CronJob } from "cron";
import moment from "moment-timezone";
import { BillingService } from "../services/BillingService";
import { logger, logBillingJob } from "../utils/logger";
import { config } from "../config";
import { getRepository } from "typeorm";
import { BillingJob, BillingJobStatus } from "../entities/BillingJob";

export class BillingScheduler {
  private billingService: BillingService;
  private monthlyJob: CronJob | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.billingService = new BillingService();
  }

  /**
   * Start the billing scheduler
   */
  start(): void {
    try {
      // Schedule monthly billing job - runs on the 1st of each month at 2 AM PST
      this.monthlyJob = new CronJob(
        "0 2 1 * *", // 2 AM PST on 1st of month
        () => this.runMonthlyBilling(),
        null,
        false,
        config.billing.timezone
      );

      this.monthlyJob.start();

      logger.info("Billing scheduler started successfully", {
        timezone: config.billing.timezone,
        schedule: "0 2 1 * * (2 AM PST on 1st of month)",
      });

      // Run initial billing if it's the first time
      this.checkAndRunInitialBilling();
    } catch (error) {
      logger.error("Failed to start billing scheduler", { error });
      throw error;
    }
  }

  /**
   * Stop the billing scheduler
   */
  stop(): void {
    if (this.monthlyJob) {
      this.monthlyJob.stop();
      this.monthlyJob = null;
      logger.info("Billing scheduler stopped");
    }
  }

  /**
   * Check if it's time to run initial billing
   */
  private async checkAndRunInitialBilling(): Promise<void> {
    try {
      const billingJobRepo = getRepository(BillingJob);
      const lastJob = await billingJobRepo.findOne({
        order: { createdAt: "DESC" },
      });

      // If no previous jobs, run billing for the previous month
      if (!lastJob) {
        logger.info("No previous billing jobs found, running initial billing");
        const previousMonth = moment().subtract(1, "month");
        await this.runBillingForPeriod(
          previousMonth.startOf("month").toDate(),
          previousMonth.endOf("month").toDate()
        );
      }
    } catch (error) {
      logger.error("Failed to check initial billing", { error });
    }
  }

  /**
   * Run monthly billing job
   */
  private async runMonthlyBilling(): Promise<void> {
    if (this.isRunning) {
      logger.warn("Monthly billing job already running, skipping");
      return;
    }

    this.isRunning = true;

    try {
      logger.info("Starting monthly billing job");

      // Calculate billing period (previous month)
      const now = moment().tz(config.billing.timezone);
      const previousMonth = now.subtract(1, "month");

      const startDate = previousMonth.startOf("month").toDate();
      const endDate = previousMonth.endOf("month").toDate();

      logBillingJob("monthly_scheduled", "started", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        timezone: config.billing.timezone,
      });

      await this.runBillingForPeriod(startDate, endDate);

      logBillingJob("monthly_scheduled", "completed", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      logger.info("Monthly billing job completed successfully");
    } catch (error) {
      logger.error("Monthly billing job failed", { error });
      logBillingJob("monthly_scheduled", "failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Send alert on failure
      await this.sendFailureAlert("Monthly billing job failed", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run billing for a specific period
   */
  async runBillingForPeriod(
    startDate: Date,
    endDate: Date,
    clientId?: string,
    isDryRun: boolean = false
  ): Promise<any> {
    try {
      logBillingJob("manual_run", "started", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        clientId,
        isDryRun,
      });

      const result = await this.billingService.runBillingJob(
        startDate,
        endDate,
        clientId,
        isDryRun
      );

      logBillingJob("manual_run", "completed", {
        jobId: result.jobId,
        totalClients: result.totalClients,
        totalInvoices: result.totalInvoices,
        totalAmount: result.totalAmount,
        errors: result.errors,
      });

      return result;
    } catch (error) {
      logger.error("Billing job failed", {
        error,
        startDate,
        endDate,
        clientId,
      });
      logBillingJob("manual_run", "failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        clientId,
      });

      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    isSchedulerActive: boolean;
    nextRun: Date | null;
    lastRun: Date | null;
  } {
    return {
      isRunning: this.isRunning,
      isSchedulerActive: !!this.monthlyJob,
      nextRun: this.monthlyJob?.nextDate()?.toJSDate() || null,
      lastRun: null, // CronJob doesn't track last run
    };
  }

  /**
   * Send failure alert
   */
  private async sendFailureAlert(message: string, error: any): Promise<void> {
    try {
      // Log the alert
      logger.error(`ALERT: ${message}`, { error });

      // TODO: Implement email/Slack alerts
      // For now, just log the alert
      // await this.sendEmailAlert(message, error);
      // await this.sendSlackAlert(message, error);
    } catch (alertError) {
      logger.error("Failed to send failure alert", {
        alertError,
        originalError: error,
      });
    }
  }

  /**
   * Test the scheduler
   */
  async testScheduler(): Promise<boolean> {
    try {
      logger.info("Testing billing scheduler...");

      // Run a test billing job for the last 7 days
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      await this.runBillingForPeriod(startDate, endDate, undefined, true);

      logger.info("Billing scheduler test completed successfully");
      return true;
    } catch (error) {
      logger.error("Billing scheduler test failed", { error });
      return false;
    }
  }
}
