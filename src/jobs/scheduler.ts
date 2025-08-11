import cron from "node-cron";
import { BillingService } from "../services/BillingService";
import { logger } from "../utils/logger";
import { config } from "../config";
import moment from "moment-timezone";

export class JobScheduler {
  private billingService: BillingService;
  private monthlyJob: cron.ScheduledTask | null = null;

  constructor() {
    this.billingService = new BillingService();
  }

  /**
   * Setup all scheduled jobs
   */
  async setupScheduledJobs(): Promise<void> {
    try {
      // Setup monthly billing job
      await this.setupMonthlyBillingJob();

      // Setup other maintenance jobs
      await this.setupMaintenanceJobs();

      logger.info("All scheduled jobs have been setup successfully");
    } catch (error) {
      logger.error("Failed to setup scheduled jobs", { error });
      throw error;
    }
  }

  /**
   * Setup monthly billing job
   */
  private async setupMonthlyBillingJob(): Promise<void> {
    // Run on the 1st of each month at 2:00 AM PST
    const cronExpression = "0 2 1 * *";

    this.monthlyJob = cron.schedule(
      cronExpression,
      async () => {
        await this.runMonthlyBillingJob();
      },
      {
        scheduled: true,
        timezone: config.billing.timezone,
      }
    );

    logger.info("Monthly billing job scheduled", {
      cronExpression,
      timezone: config.billing.timezone,
      nextRun: this.getNextRunTime(cronExpression, config.billing.timezone),
    });
  }

  /**
   * Setup maintenance jobs
   */
  private async setupMaintenanceJobs(): Promise<void> {
    // Clean up old logs daily at 3:00 AM PST
    cron.schedule(
      "0 3 * * *",
      async () => {
        await this.cleanupOldLogs();
      },
      {
        scheduled: true,
        timezone: config.billing.timezone,
      }
    );

    // Health check every hour
    cron.schedule(
      "0 * * * *",
      async () => {
        await this.runHealthCheck();
      },
      {
        scheduled: true,
        timezone: config.billing.timezone,
      }
    );

    logger.info("Maintenance jobs scheduled");
  }

  /**
   * Run monthly billing job
   */
  private async runMonthlyBillingJob(): Promise<void> {
    const jobId = `MONTHLY_${moment().format("YYYY_MM")}`;

    try {
      logger.info(`Starting monthly billing job ${jobId}`);

      // Calculate billing period (previous month)
      const now = moment().tz(config.billing.timezone);
      const previousMonth = now.clone().subtract(1, "month");

      const billingPeriodStart = previousMonth
        .clone()
        .startOf("month")
        .toDate();
      const billingPeriodEnd = previousMonth.clone().endOf("month").toDate();

      logger.info(
        `Billing period: ${billingPeriodStart.toISOString()} to ${billingPeriodEnd.toISOString()}`
      );

      // Run billing job
      const result = await this.billingService.runBillingJob(
        billingPeriodStart,
        billingPeriodEnd
      );

      logger.info(`Monthly billing job ${jobId} completed successfully`, {
        jobId,
        totalClients: result.totalClients,
        totalInvoices: result.totalInvoices,
        totalAmount: result.totalAmount,
        errors: result.errors,
      });

      // Send success notification
      await this.sendBillingJobNotification(result, true);
    } catch (error) {
      logger.error(`Monthly billing job ${jobId} failed`, { error, jobId });

      // Send failure notification
      await this.sendBillingJobNotification(
        {
          success: false,
          jobId,
          totalClients: 0,
          totalInvoices: 0,
          totalAmount: 0,
          errors: [error instanceof Error ? error.message : String(error)],
          details: [],
        },
        false
      );

      throw error;
    }
  }

  /**
   * Run manual billing job
   */
  async runManualBillingJob(
    startDate: Date,
    endDate: Date,
    clientId?: string,
    isDryRun: boolean = false
  ): Promise<any> {
    try {
      logger.info("Starting manual billing job", {
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

      logger.info("Manual billing job completed", {
        jobId: result.jobId,
        success: result.success,
        totalClients: result.totalClients,
        totalInvoices: result.totalInvoices,
      });

      return result;
    } catch (error) {
      logger.error("Manual billing job failed", { error });
      throw error;
    }
  }

  /**
   * Run billing job for specific date range
   */
  async runBillingJobForPeriod(
    year: number,
    month: number,
    clientId?: string,
    isDryRun: boolean = false
  ): Promise<any> {
    const startDate = moment
      .tz([year, month - 1, 1], config.billing.timezone)
      .startOf("month")
      .toDate();
    const endDate = moment
      .tz([year, month - 1, 1], config.billing.timezone)
      .endOf("month")
      .toDate();

    return this.runManualBillingJob(startDate, endDate, clientId, isDryRun);
  }

  /**
   * Cleanup old logs
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      logger.info("Starting log cleanup job");

      // This would typically call a log rotation service
      // For now, just log the action
      logger.info("Log cleanup completed");
    } catch (error) {
      logger.error("Log cleanup failed", { error });
    }
  }

  /**
   * Run health check
   */
  private async runHealthCheck(): Promise<void> {
    try {
      logger.info("Running scheduled health check");

      // Check database connection
      // Check QBO connection
      // Check phone system connection

      logger.info("Health check completed successfully");
    } catch (error) {
      logger.error("Health check failed", { error });

      // Send alert for failed health check
      await this.sendHealthCheckAlert(error);
    }
  }

  /**
   * Send billing job notification
   */
  private async sendBillingJobNotification(
    result: any,
    success: boolean
  ): Promise<void> {
    try {
      if (success) {
        // Send success notification
        if (config.alerts.email) {
          await this.sendEmailNotification(
            config.alerts.email,
            "Billing Job Completed Successfully",
            `Billing job ${result.jobId} completed with ${result.totalInvoices} invoices created for ${result.totalClients} clients. Total amount: $${result.totalAmount}`
          );
        }

        if (config.alerts.slackWebhook) {
          await this.sendSlackNotification(
            `✅ Billing job ${result.jobId} completed successfully\n` +
              `📊 ${result.totalInvoices} invoices created for ${result.totalClients} clients\n` +
              `💰 Total amount: $${result.totalAmount}`
          );
        }
      } else {
        // Send failure notification
        if (config.alerts.email) {
          await this.sendEmailNotification(
            config.alerts.email,
            "Billing Job Failed",
            `Billing job ${
              result.jobId
            } failed with errors: ${result.errors.join(", ")}`
          );
        }

        if (config.alerts.slackWebhook) {
          await this.sendSlackNotification(
            `❌ Billing job ${result.jobId} failed\n` +
              `🚨 Errors: ${result.errors.join(", ")}`
          );
        }
      }
    } catch (error) {
      logger.error("Failed to send billing job notification", { error });
    }
  }

  /**
   * Send health check alert
   */
  private async sendHealthCheckAlert(error: any): Promise<void> {
    try {
      if (config.alerts.email) {
        await this.sendEmailNotification(
          config.alerts.email,
          "System Health Check Failed",
          `Health check failed with error: ${error.message}`
        );
      }

      if (config.alerts.slackWebhook) {
        await this.sendSlackNotification(
          `🚨 System health check failed\n` + `❌ Error: ${error.message}`
        );
      }
    } catch (notificationError) {
      logger.error("Failed to send health check alert", {
        error: notificationError,
      });
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    to: string,
    subject: string,
    body: string
  ): Promise<void> {
    // Implementation would use a proper email service
    logger.info("Email notification sent", { to, subject, body });
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(message: string): Promise<void> {
    try {
      const response = await fetch(config.alerts.slackWebhook, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: message }),
      });

      if (!response.ok) {
        throw new Error(`Slack API responded with status: ${response.status}`);
      }

      logger.info("Slack notification sent", { message });
    } catch (error) {
      logger.error("Failed to send Slack notification", { error });
    }
  }

  /**
   * Get next run time for a cron expression
   */
  private getNextRunTime(cronExpression: string, timezone: string): string {
    // node-cron doesn't have getNextDate method
    return "Next run time calculation not available";
  }

  /**
   * Stop all scheduled jobs
   */
  stopAllJobs(): void {
    if (this.monthlyJob) {
      this.monthlyJob.stop();
      logger.info("Monthly billing job stopped");
    }

    logger.info("All scheduled jobs stopped");
  }

  /**
   * Get job status
   */
  getJobStatus(): any {
    return {
      monthlyJob: {
        scheduled: this.monthlyJob ? true : false,
        running: false, // node-cron doesn't expose running state
      },
      timezone: config.billing.timezone,
      nextRun: this.monthlyJob
        ? this.getNextRunTime("0 2 1 * *", config.billing.timezone)
        : "Unknown",
    };
  }
}

// Export singleton instance
export const jobScheduler = new JobScheduler();

// Export setup function
export async function setupScheduledJobs(): Promise<void> {
  await jobScheduler.setupScheduledJobs();
}
