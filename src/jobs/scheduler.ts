import { BillingScheduler } from "./billingScheduler";
import { logger } from "../utils/logger";

export class JobScheduler {
  private billingScheduler: BillingScheduler;

  constructor() {
    this.billingScheduler = new BillingScheduler();
  }

  /**
   * Setup all scheduled jobs
   */
  async setupScheduledJobs(): Promise<void> {
    try {
      // Start the billing scheduler
      this.billingScheduler.start();

      logger.info("All scheduled jobs have been setup successfully");
    } catch (error) {
      logger.error("Failed to setup scheduled jobs", { error });
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      billing: this.billingScheduler.getStatus(),
    };
  }

  /**
   * Test the billing scheduler
   */
  async testBillingScheduler(): Promise<boolean> {
    return this.billingScheduler.testScheduler();
  }

  /**
   * Run manual billing job
   */
  async runManualBilling(
    startDate: Date,
    endDate: Date,
    clientId?: string,
    isDryRun: boolean = false
  ) {
    return this.billingScheduler.runBillingForPeriod(
      startDate,
      endDate,
      clientId,
      isDryRun
    );
  }

  /**
   * Stop all schedulers
   */
  stop(): void {
    this.billingScheduler.stop();
    logger.info("All schedulers stopped");
  }
}
