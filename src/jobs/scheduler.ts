import { QueueBillingScheduler } from "./billingScheduler";
import { logger } from "../utils/logger";

export class JobScheduler {
  private billingScheduler: QueueBillingScheduler;

  constructor() {
    this.billingScheduler = new QueueBillingScheduler();
  }

  /**
   * Setup all scheduled jobs
   */
  async setupScheduledJobs(): Promise<void> {
    try {
      // Start the billing scheduler
      this.billingScheduler.initializeScheduler();

      logger.info("All scheduled jobs have been setup successfully");
    } catch (error) {
      logger.error("Failed to setup scheduled jobs", { error });
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  async getStatus() {
    return {
      billing: await this.billingScheduler.getStatus(),
    };
  }

  /**
   * Stop all schedulers
   */
  stop(): void {
    this.billingScheduler.stop();
    logger.info("All schedulers stopped");
  }
}
