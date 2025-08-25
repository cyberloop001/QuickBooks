import { getRepository, Repository } from "typeorm";
import { CronJob } from "cron";
import { CustomerProfile } from "../entities/CustomerProfile";
import { BillingService } from "../services/BillingService";
import { logger } from "../utils/logger";
import moment from "moment-timezone";
import { config } from "../config";

export class QueueBillingScheduler {
  private billingService: BillingService;
  private cronJobs: Map<string, CronJob> = new Map();
  private isRunning: boolean = false;

  constructor() {
    this.billingService = new BillingService();
    this.initializeScheduler();
  }

  /**
   * Initialize the billing scheduler for queue-based billing
   */
  public async initializeScheduler() {
    try {
      logger.info("Initializing queue-based billing scheduler...");

      // Get all active customer profiles
      const customerProfileRepo = getRepository(CustomerProfile);
      const customers = await customerProfileRepo.find({
        where: { isActive: true },
        select: ["id", "billDate", "billingPeriodStart", "billingPeriodEnd"],
      });

      // Schedule billing for each customer
      for (const customer of customers) {
        this.scheduleMonthlyBilling(customer);
      }

      logger.info(`Scheduled billing for ${customers.length} customers`);
    } catch (error) {
      logger.error("Failed to initialize queue-based billing scheduler", {
        error,
      });
    }
  }

  /**
   * Schedule monthly billing for all queues
   */
  public scheduleMonthlyBilling(customer: CustomerProfile) {
    try {
      // Remove existing cron job if it exists
      if (this.cronJobs.has(customer.id)) {
        this.cronJobs.get(customer.id)?.stop();
        this.cronJobs.delete(customer.id);
      }

      // Create cron expression for the customer's billing date
      // Run at 2 AM on the billing date
      const cronExpression = `0 2 ${customer.billDate} * *`;

      const cronJob = new CronJob(
        cronExpression,
        () => this.processMonthlyBilling(customer),
        null,
        false,
        config.billing.timezone
      );

      // Store the cron job
      this.cronJobs.set(customer.id, cronJob);

      // Start the cron job
      cronJob.start();

      logger.info(
        `Scheduled billing for customer ${customer.id} on day ${customer.billDate} of each month`
      );
    } catch (error) {
      logger.error("Failed to schedule monthly billing", { error });
    }
  }

  /**
   * Process monthly billing for all queues
   */
  private async processMonthlyBilling(customer: CustomerProfile) {
    if (this.isRunning) {
      logger.warn(
        `Billing already in progress for customer ${customer.id}, skipping`
      );
      return;
    }

    try {
      this.isRunning = true;
      logger.info(`Starting billing process for customer ${customer.id}`);

      // Calculate billing period for the current month
      const now = moment().tz(config.billing.timezone);
      const currentMonth = now.month() + 1; // moment months are 0-indexed
      const currentYear = now.year();

      const billingPeriod = customer.getBillingPeriodForMonth(
        currentYear,
        currentMonth
      );

      logger.info(
        `Billing period for customer ${
          customer.id
        }: ${billingPeriod.start.toISOString()} to ${billingPeriod.end.toISOString()}`
      );

      // Run billing job for this customer
      const result = await this.billingService.runBillingJob(
        billingPeriod.start,
        billingPeriod.end,
        customer.id,
        false // Not a dry run
      );

      logger.info("Monthly billing completed for all queues", {
        jobId: result.jobId,
        totalQueues: result.totalQueues,
        totalInvoices: result.totalInvoices,
        totalAmount: result.totalAmount,
      });
    } catch (error) {
      logger.error("Monthly billing failed", { error });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get all scheduled billing jobs
   */
  public async getScheduledJobs(): Promise<
    Array<{
      customerId: string;
      customerName: string;
      billDate: number;
      billingPeriodStart: number;
      billingPeriodEnd: number;
      minimumMinutes: number;
      overageRatePerMinute: number;
      nextRun: Date;
    }>
  > {
    const scheduledJobs: Array<{
      customerId: string;
      customerName: string;
      billDate: number;
      billingPeriodStart: number;
      billingPeriodEnd: number;
      minimumMinutes: number;
      overageRatePerMinute: number;
      nextRun: Date;
    }> = [];

    try {
      const customerProfileRepo = getRepository(CustomerProfile);

      for (const [customerId, cronJob] of this.cronJobs) {
        // Fetch customer profile to get billing details
        const customer = await customerProfileRepo.findOne({
          where: { id: customerId },
          select: [
            "id",
            "qboDisplayName",
            "qboCompanyName",
            "billDate",
            "billingPeriodStart",
            "billingPeriodEnd",
            "minimumMinutes",
            "overageRatePerMinute",
          ],
        });

        if (customer) {
          const nextRun = cronJob.nextDate().toJSDate();
          const customerName =
            customer.qboCompanyName || customer.qboDisplayName;

          scheduledJobs.push({
            customerId: customer.id,
            customerName,
            billDate: customer.billDate,
            billingPeriodStart: customer.billingPeriodStart,
            billingPeriodEnd: customer.billingPeriodEnd,
            minimumMinutes: customer.minimumMinutes,
            overageRatePerMinute: customer.overageRatePerMinute,
            nextRun,
          });
        }
      }
    } catch (error) {
      logger.error("Failed to fetch customer details for scheduled jobs", {
        error,
      });
    }

    return scheduledJobs;
  }

  /**
   * Get scheduler status
   */
  public async getStatus() {
    return {
      isRunning: this.isRunning,
      totalScheduledJobs: this.cronJobs.size,
      scheduledJobs: await this.getScheduledJobs(),
      timezone: config.billing.timezone,
    };
  }

  /**
   * Stop all cron jobs
   */
  public stop() {
    for (const [jobType, cronJob] of this.cronJobs) {
      cronJob.stop();
    }
    this.cronJobs.clear();
    logger.info("Stopped all queue-based billing schedules");
  }

  /**
   * Refresh schedules
   */
  public async refreshSchedules() {
    logger.info("Refreshing queue-based billing schedules...");

    // Stop all existing cron jobs
    this.stop();

    // Reinitialize scheduler
    await this.initializeScheduler();
  }

  /**
   * Run billing manually for a specific period
   */
  public async runManualBilling(
    startDate: Date,
    endDate: Date,
    isDryRun: boolean = false
  ) {
    try {
      logger.info("Running manual billing job", {
        startDate,
        endDate,
        isDryRun,
      });

      const result = await this.billingService.runBillingJob(
        startDate,
        endDate,
        undefined, // No specific client ID for queue-based billing
        isDryRun
      );

      logger.info("Manual billing job completed", {
        jobId: result.jobId,
        totalQueues: result.totalQueues,
        totalInvoices: result.totalInvoices,
        totalAmount: result.totalAmount,
      });

      return result;
    } catch (error) {
      logger.error("Manual billing job failed", { error });
      throw error;
    }
  }
}
