import { getRepository, Repository, Like } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import moment from "moment-timezone";
import { CustomerProfile } from "../entities/CustomerProfile";
import { PhoneUsage } from "../entities/PhoneUsage";
import {
  BillingJob,
  BillingJobStatus,
  BillingJobType,
} from "../entities/BillingJob";
import { QBOService } from "./QBOService";
import { getQBOService } from "../routes/qbo";
import { GenesysService } from "./GenesysService";
import { logger, logBillingJob } from "../utils/logger";
import { config } from "../config";
import * as fs from "fs";

export interface BillingResult {
  success: boolean;
  jobId: string;
  totalQueues: number;
  totalInvoices: number;
  totalAmount: number;
  errors: string[];
  details: QueueBillingResult[];
}

export interface QueueBillingResult {
  queueId: string;
  queueName: string;
  totalCalls: number;
  totalMinutes: number;
  totalAmount: number;
  baseMinutes?: number;
  overageMinutes?: number;
  overageAmount?: number;
  minimumCharge?: number;
  invoiceCreated: boolean;
  invoiceId?: string;
  error?: string;
}

export class BillingService {
  private qboService: QBOService;
  private genesysService: GenesysService;

  constructor() {
    this.qboService = getQBOService;
    this.genesysService = new GenesysService();
  }

  private get customerProfileRepository(): Repository<CustomerProfile> {
    return getRepository(CustomerProfile);
  }

  private get phoneUsageRepository(): Repository<PhoneUsage> {
    return getRepository(PhoneUsage);
  }

  private get billingJobRepository(): Repository<BillingJob> {
    return getRepository(BillingJob);
  }

  /**
   * Run the main billing job for a specific period
   */
  async runBillingJob(
    billingPeriodStart: Date,
    billingPeriodEnd: Date,
    queueName: string,
    isDryRun: boolean = false,
    customerBillingConfig?: {
      basicRatePerMinute: number;
      minimumMinutes: number;
      overageRatePerMinute: number;
    }
  ): Promise<BillingResult> {
    const jobId = `BILL_${moment(billingPeriodStart).format(
      "YYYY_MM_DD"
    )}_${uuidv4().substring(0, 8)}`;
    const jobType = isDryRun ? BillingJobType.DRY_RUN : BillingJobType.MONTHLY;

    logger.info(`Starting billing job ${jobId}`, {
      jobId,
      type: jobType,
      periodStart: billingPeriodStart,
      periodEnd: billingPeriodEnd,
      queueName,
      isDryRun,
    });

    // Create billing job record
    const billingJob = await this.createBillingJob(
      jobId,
      jobType,
      billingPeriodStart,
      billingPeriodEnd,
      queueName
    );

    try {
      // Check if QBO service is authenticated before starting
      if (!this.qboService.isAuthenticated()) {
        throw new Error(
          "QBO service is not authenticated. Please complete the OAuth flow in the QBO settings page before running billing jobs."
        );
      }

      // Update job status to in progress
      await this.updateBillingJobStatus(
        billingJob.id,
        BillingJobStatus.IN_PROGRESS
      );

      // Fetch phone usage data
      const phoneUsageData = await this.fetchPhoneUsageData(
        billingPeriodStart,
        billingPeriodEnd,
        queueName
      );

      // Aggregate usage by queue
      const aggregatedUsage = await this.aggregateUsageByQueue(
        phoneUsageData,
        billingPeriodStart,
        billingPeriodEnd,
        queueName,
        customerBillingConfig
      );

      // Create invoices (or simulate for dry run)
      const billingResults = await this.processQueueBilling(
        aggregatedUsage,
        billingJob,
        isDryRun
      );

      // Update billing job with results
      await this.updateBillingJobResults(billingJob.id, billingResults);

      // Update job status to completed
      await this.updateBillingJobStatus(
        billingJob.id,
        BillingJobStatus.COMPLETED
      );

      const result: BillingResult = {
        success: true,
        jobId,
        totalQueues: billingResults.length,
        totalInvoices: billingResults.filter((r) => r.invoiceCreated).length,
        totalAmount: billingResults.reduce((sum, r) => sum + r.totalAmount, 0),
        errors: billingResults.filter((r) => r.error).map((r) => r.error!),
        details: billingResults,
      };

      logBillingJob(jobId, "completed", result);
      return result;
    } catch (error) {
      logger.error(`Billing job ${jobId} failed`, { error, jobId });

      // Update job status to failed
      await this.updateBillingJobStatus(
        billingJob.id,
        BillingJobStatus.FAILED,
        error instanceof Error ? error.message : "Unknown error"
      );

      throw error;
    }
  }

  /**
   * Fetch phone usage data from Genesys Cloud Analytics API
   */
  private async fetchPhoneUsageData(
    startDate: Date,
    endDate: Date,
    queueName: string
  ): Promise<any[]> {
    try {
      let usageData: any[] = [];

      // Try Genesys Cloud first if configured
      if (config.genesys.clientId && config.genesys.clientSecret) {
        try {
          logger.info(
            "Fetching billing call data from Genesys Cloud Analytics API..."
          );

          // Use the new queue-based billing method
          const billingData =
            await this.genesysService.getQueueBasedBillingData(
              startDate,
              endDate,
              queueName // Pass queue name if specified
            );

          // Convert Genesys data to billing format
          usageData = billingData.callRecords.map((record) => ({
            call_id: record.conversationId,
            queueId: record.queueId || "unknown",
            queueName: record.queueName || "Unknown Queue",
            started_at: record.startTime,
            ended_at: record.endTime,
            billable_seconds: record.duration,
          }));

          logger.info(
            "Successfully fetched queue-based billing data from Genesys Cloud Analytics API",
            {
              count: usageData.length,
              totalHits: billingData.aggregations.totalCalls,
              totalMinutes: billingData.aggregations.totalMinutes,
              startDate,
              endDate,
              queueName,
            }
          );
        } catch (genesysError) {
          logger.warn(
            "Failed to fetch from Genesys Cloud Analytics API, falling back to phone system",
            { error: genesysError }
          );
        }
      }

      // If no Genesys data or fallback needed, try phone system
      if (usageData.length === 0) {
        try {
          logger.info("Fetching phone usage data from phone system...");
          const phoneUsageRepo = this.phoneUsageRepository;
          const usageQuery = phoneUsageRepo
            .createQueryBuilder("usage")
            .where("usage.startedAt >= :startDate", { startDate })
            .andWhere("usage.startedAt <= :endDate", { endDate });

          if (queueName) {
            // Filter by queue name
            usageQuery.andWhere("usage.queueName = :queueName", { queueName });
          }

          const phoneUsageData = await usageQuery.getMany();

          usageData = phoneUsageData.map((usage) => ({
            call_id: usage.callId,
            queueId: usage.queueId || "unknown",
            queueName: usage.queueName || "Unknown Queue",
            started_at: usage.startedAt,
            ended_at: usage.endedAt,
            billable_seconds: usage.billableSeconds,
          }));

          logger.info("Successfully fetched phone usage data", {
            count: usageData.length,
            startDate,
            endDate,
            queueName,
          });
        } catch (phoneError) {
          logger.error("Failed to fetch phone usage data", {
            error: phoneError,
          });
          throw new Error("Failed to fetch usage data from all sources");
        }
      }

      return usageData;
    } catch (error) {
      logger.error("Failed to fetch phone usage data", {
        error,
        startDate,
        endDate,
        queueName,
      });
      throw error;
    }
  }

  /**
   * Store phone usage data in database
   */
  private async storePhoneUsageData(usageData: any[]): Promise<void> {
    const phoneUsageRepo = getRepository(PhoneUsage);
    const customerProfileRepo = getRepository(CustomerProfile);

    for (const usage of usageData) {
      // Check if usage already exists
      const existingUsage = await phoneUsageRepo.findOne({
        where: { callId: usage.call_id },
      });

      if (!existingUsage) {
        // Get customer profile for billing calculation
        const customerProfile = await customerProfileRepo.findOne({
          where: { id: usage.customerProfileId },
          select: ["minimumMinutes", "overageRatePerMinute", "ratePerMinute"],
        });

        const phoneUsage = new PhoneUsage();
        phoneUsage.callId = usage.call_id;
        phoneUsage.customerProfileId = usage.customerProfileId;
        phoneUsage.startedAt = new Date(usage.started_at);
        phoneUsage.endedAt = new Date(usage.ended_at);
        phoneUsage.billableSeconds = usage.billable_seconds;
        phoneUsage.startedPst = new Date(usage.started_pst);
        phoneUsage.endedPst = new Date(usage.ended_pst);
        phoneUsage.billableMinutes = usage.billable_seconds / 60;

        // Calculate amount based on customer profile billing settings
        if (customerProfile) {
          const minutes = usage.billable_seconds / 60;
          const { minimumMinutes, overageRatePerMinute, ratePerMinute } =
            customerProfile;

          if (minimumMinutes > 0) {
            // Package pricing: minimum + overage
            const baseMinutes = Math.min(minutes, minimumMinutes);
            const overageMinutes = Math.max(0, minutes - minimumMinutes);
            phoneUsage.amount =
              baseMinutes * ratePerMinute +
              overageMinutes * overageRatePerMinute;
          } else {
            // Flat rate pricing
            phoneUsage.amount = minutes * ratePerMinute;
          }
        } else {
          // Fallback to default rate
          phoneUsage.amount = (usage.billable_seconds / 60) * 1.0;
        }

        phoneUsage.isBilled = false;

        await phoneUsageRepo.save(phoneUsage);
      }
    }
  }

  /**
   * Aggregate usage data by client
   */
  private async aggregateUsageByClient(
    usageData: any[],
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, any>> {
    const clientRepo = getRepository(CustomerProfile);
    const aggregatedUsage = new Map<string, any>();

    for (const usage of usageData) {
      const clientId = usage.customerProfileId;

      if (!aggregatedUsage.has(clientId)) {
        // Get client details
        const client = await clientRepo.findOne({
          where: { id: clientId },
        });

        if (!client) {
          logger.warn(
            `Customer profile not found for phone system ID: ${clientId}`
          );
          continue;
        }

        aggregatedUsage.set(clientId, {
          client,
          totalCalls: 0,
          totalSeconds: 0,
          totalMinutes: 0,
          totalAmount: 0,
          calls: [],
        });
      }

      const clientUsage = aggregatedUsage.get(clientId);
      clientUsage.totalCalls++;
      clientUsage.totalSeconds += usage.billable_seconds;
      clientUsage.totalMinutes += usage.billable_seconds / 60;

      // Calculate amount based on customer profile billing settings
      const minutes = usage.billable_seconds / 60;
      if (clientUsage.client.minimumMinutes > 0) {
        // Package pricing: minimum + overage
        const baseMinutes = Math.min(
          minutes,
          clientUsage.client.minimumMinutes
        );
        const overageMinutes = Math.max(
          0,
          minutes - clientUsage.client.minimumMinutes
        );
        clientUsage.totalAmount +=
          baseMinutes * clientUsage.client.ratePerMinute +
          overageMinutes * clientUsage.client.overageRatePerMinute;
      } else {
        // Flat rate pricing
        clientUsage.totalAmount += minutes * clientUsage.client.ratePerMinute;
      }

      clientUsage.calls.push(usage);
    }

    // Round totals to 2 decimal places
    for (const [clientId, usage] of aggregatedUsage) {
      usage.totalMinutes = Math.round(usage.totalMinutes * 100) / 100;
      usage.totalAmount = Math.round(usage.totalAmount * 100) / 100;
    }

    return aggregatedUsage;
  }

  /**
   * Aggregate usage data by queue and calculate billing based on customer configuration
   */
  private async aggregateUsageByQueue(
    usageData: any[],
    startDate: Date,
    endDate: Date,
    specificQueueName?: string,
    customerBillingConfig?: {
      basicRatePerMinute: number;
      minimumMinutes: number;
      overageRatePerMinute: number;
    }
  ): Promise<Map<string, any>> {
    const aggregatedUsage = new Map<string, any>();

    // Step 1: Aggregate raw usage data by queue
    for (const usage of usageData) {
      const queueId = usage.queueId || "unknown";
      const queueName = usage.queueName || "Unknown Queue";

      // If we're filtering by a specific queue, skip others
      if (specificQueueName && queueName !== specificQueueName) {
        continue;
      }

      if (!aggregatedUsage.has(queueId)) {
        // Initialize queue usage data structure
        aggregatedUsage.set(queueId, {
          queueId,
          queueName,
          totalCalls: 0,
          totalSeconds: 0,
          totalMinutes: 0,
          totalAmount: 0,
          baseMinutes: 0,
          overageMinutes: 0,
          overageAmount: 0,
          minimumCharge: 0,
          calls: [],
        });
      }

      const queueUsage = aggregatedUsage.get(queueId);

      // Accumulate usage data
      queueUsage.totalCalls++;
      queueUsage.totalSeconds += usage.billable_seconds;
      queueUsage.totalMinutes += usage.billable_seconds / 60;
      queueUsage.calls.push(usage);
    }

    // Step 2: Calculate billing for each queue based on total period usage
    for (const [queueId, usage] of aggregatedUsage) {
      if (customerBillingConfig && customerBillingConfig.minimumMinutes > 0) {
        // Calculate minimum charge (always applies, even if usage is below minimum)
        const minimumCharge =
          customerBillingConfig.basicRatePerMinute *
          customerBillingConfig.minimumMinutes;
        usage.minimumCharge = minimumCharge;

        // Calculate overage minutes (only for minutes exceeding minimum)
        const overageMinutes = Math.max(
          0,
          usage.totalMinutes - customerBillingConfig.minimumMinutes
        );
        usage.overageMinutes = overageMinutes;

        // Calculate overage amount
        const overageAmount =
          overageMinutes * customerBillingConfig.overageRatePerMinute;
        usage.overageAmount = overageAmount;

        // Base minutes are the minutes covered by minimum (up to minimum or actual usage, whichever is less)
        usage.baseMinutes = Math.min(
          usage.totalMinutes,
          customerBillingConfig.minimumMinutes
        );

        // Total amount is minimum charge + overage (if any)
        usage.totalAmount = minimumCharge + overageAmount;

        logger.info(`Billing calculation for queue ${usage.queueName}:`, {
          queueId: usage.queueId,
          queueName: usage.queueName,
          totalMinutes: usage.totalMinutes,
          minimumMinutes: customerBillingConfig.minimumMinutes,
          minimumCharge: usage.minimumCharge,
          baseMinutes: usage.baseMinutes,
          overageMinutes: usage.overageMinutes,
          overageAmount: usage.overageAmount,
          totalAmount: usage.totalAmount,
          basicRate: customerBillingConfig.basicRatePerMinute,
          overageRate: customerBillingConfig.overageRatePerMinute,
        });
      } else {
        // No customer billing configuration - fallback to default rate
        const defaultRatePerMinute = 1.0;
        usage.totalAmount = usage.totalMinutes * defaultRatePerMinute;

        // Set default values for consistency
        usage.baseMinutes = usage.totalMinutes;
        usage.overageMinutes = 0;
        usage.overageAmount = 0;
        usage.minimumCharge = 0;

        logger.info(
          `Billing calculation for queue ${usage.queueName} (default rate):`,
          {
            queueId: usage.queueId,
            queueName: usage.queueName,
            totalMinutes: usage.totalMinutes,
            totalAmount: usage.totalAmount,
            ratePerMinute: defaultRatePerMinute,
          }
        );
      }
    }

    // Step 3: Round all monetary and time values to 2 decimal places for consistency
    for (const [queueId, usage] of aggregatedUsage) {
      usage.totalMinutes = Math.round(usage.totalMinutes * 100) / 100;
      usage.totalAmount = Math.round(usage.totalAmount * 100) / 100;
      usage.baseMinutes = Math.round(usage.baseMinutes * 100) / 100;
      usage.overageMinutes = Math.round(usage.overageMinutes * 100) / 100;
      usage.overageAmount = Math.round(usage.overageAmount * 100) / 100;
      usage.minimumCharge = Math.round(usage.minimumCharge * 100) / 100;
    }

    logger.info(`Completed aggregation for ${aggregatedUsage.size} queue(s)`, {
      totalQueues: aggregatedUsage.size,
      hasBillingConfig: !!customerBillingConfig,
      billingPeriod: `${startDate.toISOString().split("T")[0]} to ${
        endDate.toISOString().split("T")[0]
      }`,
    });

    return aggregatedUsage;
  }

  /**
   * Process billing for each queue
   */
  private async processQueueBilling(
    aggregatedUsage: Map<string, any>,
    billingJob: BillingJob,
    isDryRun: boolean
  ): Promise<QueueBillingResult[]> {
    const results: QueueBillingResult[] = [];

    for (const [queueId, usage] of aggregatedUsage) {
      try {
        logger.info(`Processing billing for queue: ${usage.queueName}`, {
          queueId,
          queueName: usage.queueName,
          totalCalls: usage.totalCalls,
          totalMinutes: usage.totalMinutes,
        });

        const result = await this.processQueueBillingItem(
          usage,
          billingJob,
          isDryRun
        );

        results.push(result);
      } catch (error) {
        logger.error(
          `Failed to process billing for queue: ${usage.queueName}`,
          {
            error,
            queueId,
            queueName: usage.queueName,
          }
        );

        results.push({
          queueId,
          queueName: usage.queueName,
          totalCalls: usage.totalCalls,
          totalMinutes: usage.totalMinutes,
          totalAmount: usage.totalAmount,
          invoiceCreated: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Process billing for a single queue
   */
  private async processQueueBillingItem(
    usage: any,
    billingJob: BillingJob,
    isDryRun: boolean
  ): Promise<QueueBillingResult> {
    try {
      const {
        queueId,
        queueName,
        totalCalls,
        totalMinutes,
        totalAmount,
        baseMinutes,
        overageMinutes,
        overageAmount,
        minimumCharge,
      } = usage;

      if (isDryRun) {
        logger.info(`DRY RUN: Would create invoice for queue: ${queueName}`, {
          queueId,
          queueName,
          totalCalls,
          totalMinutes,
          totalAmount,
          baseMinutes,
          overageMinutes,
          overageAmount,
          minimumCharge,
        });

        return {
          queueId,
          queueName,
          totalCalls,
          totalMinutes,
          totalAmount,
          baseMinutes,
          overageMinutes,
          overageAmount,
          minimumCharge,
          invoiceCreated: false,
        };
      }

      // Check if QBO service is authenticated
      if (!this.qboService.isAuthenticated()) {
        throw new Error(
          "QBO service is not authenticated. Please complete the OAuth flow in the QBO settings page before running billing jobs."
        );
      }

      // Create invoice payload for queue-based billing
      const invoicePayload = await this.createQueueInvoicePayload(
        usage,
        billingJob
      );

      // Create invoice in QBO
      const invoiceResult = await this.qboService.createInvoice(invoicePayload);

      logger.info(`Successfully created invoice for queue: ${queueName}`, {
        queueId,
        queueName,
        invoiceId: invoiceResult.Id,
        totalAmount,
        baseMinutes,
        overageMinutes,
        overageAmount,
        minimumCharge,
      });

      return {
        queueId,
        queueName,
        totalCalls,
        totalMinutes,
        totalAmount,
        baseMinutes,
        overageMinutes,
        overageAmount,
        minimumCharge,
        invoiceCreated: true,
        invoiceId: invoiceResult.Id,
      };
    } catch (error) {
      logger.error(`Failed to create invoice for queue: ${usage.queueName}`, {
        error,
        queueId: usage.queueId,
        queueName: usage.queueName,
      });

      return {
        queueId: usage.queueId,
        queueName: usage.queueName,
        totalCalls: usage.totalCalls,
        totalMinutes: usage.totalMinutes,
        totalAmount: usage.totalAmount,
        baseMinutes: usage.baseMinutes,
        overageMinutes: usage.overageMinutes,
        overageAmount: usage.overageAmount,
        minimumCharge: usage.minimumCharge,
        invoiceCreated: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create invoice payload for queue-based billing in QBO
   */
  private async createQueueInvoicePayload(
    usage: any,
    billingJob: BillingJob
  ): Promise<any> {
    try {
      // Check if QBO service is authenticated
      if (!this.qboService.isAuthenticated()) {
        throw new Error(
          "QBO service is not authenticated. Please complete the OAuth flow in the QBO settings page before running billing jobs."
        );
      }

      const { queueId, queueName, totalAmount, overageAmount, minimumCharge } =
        usage;

      // Get customer profile information for invoice details
      let customerProfile: CustomerProfile | null = null;
      try {
        // Try to get customer profile from the billing job relationship first
        if (billingJob.customerProfile) {
          customerProfile = billingJob.customerProfile;
        } else {
          // Fallback: try to find by queue name if no direct relationship
          customerProfile = await this.customerProfileRepository.findOne({
            where: {
              genesysQueueNames: Like(`%${queueName}%`),
            },
          });
        }
      } catch (error) {
        logger.warn("Failed to get customer profile, using default values", {
          error,
          queueId,
          queueName,
        });
      }

      if (!customerProfile?.qboCustomerId) {
        throw new Error(
          `Customer profile not found for queue: ${queueName}. Please connect the customer profile to the queue in the customer profiles page.`
        );
      }

      // Create invoice lines based on billing structure
      const invoiceLines = {
        Amount: totalAmount,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: {
            name: config.billing.itemName || "Services",
            value: config.billing.itemId || "1",
          }, // Calculate unit price
        },
        Description: `Phone usage for ${queueName}`,
      };

      const invoicePayload = {
        Line: [invoiceLines],
        CustomerRef: {
          value: customerProfile?.qboCustomerId, // Use queue ID as customer ID for now
        },
      };

      logger.info(`Created invoice payload for queue ${queueName}`, {
        queueId,
        queueName,
        totalAmount,
        hasMinimumCharge: minimumCharge > 0,
        hasOverage: overageAmount > 0,
      });

      return invoicePayload;
    } catch (error) {
      logger.error("Failed to create queue invoice payload", {
        error,
        usage,
        billingJob,
      });
      throw error;
    }
  }

  /**
   * Mark phone usage records as billed
   */
  private async markUsageAsBilled(
    calls: any[],
    billingJobId: string,
    invoiceId: string
  ): Promise<void> {
    try {
      const phoneUsageRepo = this.phoneUsageRepository;

      // Update usage records to mark them as billed
      await phoneUsageRepo
        .createQueryBuilder()
        .update(PhoneUsage)
        .set({
          isBilled: true,
          billingJobId: billingJobId,
          qboInvoiceId: invoiceId,
          billedAt: new Date(),
        })
        .where("callId IN (:...callIds)", {
          callIds: calls.map((call) => call.call_id),
        })
        .execute();

      logger.info("Marked usage records as billed", {
        count: calls.length,
        billingJobId,
        invoiceId,
      });
    } catch (error) {
      logger.error("Failed to mark usage records as billed", { error });
      throw error;
    }
  }

  /**
   * Create a new billing job record
   */
  private async createBillingJob(
    jobId: string,
    type: BillingJobType,
    startDate: Date,
    endDate: Date,
    queueName?: string
  ): Promise<BillingJob> {
    const billingJobRepo = getRepository(BillingJob);
    const billingJob = new BillingJob();

    billingJob.jobId = jobId;
    billingJob.type = type;
    billingJob.startDate = startDate;
    billingJob.endDate = endDate;
    billingJob.startedAt = new Date();

    if (queueName) {
      // Save queue information
      billingJob.queueName = queueName;

      // Get queue ID from Genesys Cloud
      try {
        const genesysService = new GenesysService();
        const queueId = await genesysService.getQueueId(queueName);
        billingJob.queueId = queueId;
      } catch (error) {
        logger.warn(`Failed to get queue ID for queue: ${queueName}`, {
          error,
        });
        billingJob.queueId = "unknown";
      }

      // Find customer profile by searching through their genesysQueueNames array
      const customerProfile = await this.customerProfileRepository
        .createQueryBuilder("profile")
        .where("profile.isActive = :isActive", { isActive: true })
        .andWhere(":queueName = ANY(profile.genesysQueueNames)")
        .setParameter("queueName", queueName)
        .getOne();

      if (customerProfile) {
        billingJob.customerProfile = customerProfile;
        logger.info(
          `Linked billing job to customer profile: ${customerProfile.qboDisplayName}`
        );
      } else {
        logger.warn(
          `Customer profile not found for queue name: ${queueName}. Billing job will not be linked to a customer profile.`
        );
      }
    }

    return await billingJobRepo.save(billingJob);
  }

  /**
   * Update billing job status
   */
  private async updateBillingJobStatus(
    jobId: string,
    status: BillingJobStatus,
    errorMessage?: string
  ): Promise<void> {
    const billingJobRepo = getRepository(BillingJob);

    const updateData: any = { status };
    if (
      status === BillingJobStatus.COMPLETED ||
      status === BillingJobStatus.FAILED
    ) {
      updateData.completedAt = new Date();
    }
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await billingJobRepo.update(jobId, updateData);
  }

  /**
   * Update billing job with results
   */
  private async updateBillingJobResults(
    jobId: string,
    results: QueueBillingResult[]
  ): Promise<void> {
    const billingJobRepo = getRepository(BillingJob);

    await billingJobRepo.update(jobId, {
      totalQueues: results.length,
      totalInvoices: results.filter((r) => r.invoiceCreated).length,
      totalAmount: results.reduce((sum, r) => sum + r.totalAmount, 0),
      successfulInvoices: results.filter((r) => r.invoiceCreated).length,
      failedInvoices: results.filter((r) => r.error).length,
      completedAt: new Date(),
    });
  }

  /**
   * Get billing job by ID
   */
  async getBillingJob(jobId: string): Promise<BillingJob | null> {
    try {
      const billingJobRepo = this.billingJobRepository;
      return await billingJobRepo.findOne({
        where: { jobId },
        relations: ["clientBillingResults"],
      });
    } catch (error) {
      logger.error("Failed to get billing job", { error, jobId });
      throw error;
    }
  }

  /**
   * Get multiple billing jobs with pagination and filtering
   */
  async getBillingJobs(options: {
    page?: number;
    limit?: number;
    status?: BillingJobStatus;
    type?: BillingJobType;
    customerProfileId?: string;
  }): Promise<{
    jobs: BillingJob[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const { page = 1, limit = 20, status, type, customerProfileId } = options;

      const billingJobRepo = this.billingJobRepository;
      const queryBuilder = billingJobRepo.createQueryBuilder("job");

      // Add filters
      if (status) {
        queryBuilder.andWhere("job.status = :status", { status });
      }

      if (type) {
        queryBuilder.andWhere("job.type = :type", { type });
      }

      if (customerProfileId) {
        queryBuilder.andWhere("job.customerProfileId = :customerProfileId", {
          customerProfileId,
        });
      }

      // Get total count for pagination
      const total = await queryBuilder.getCount();

      // Add pagination and ordering
      const offset = (page - 1) * limit;
      queryBuilder.orderBy("job.createdAt", "DESC").skip(offset).take(limit);

      // Execute query
      const jobs = await queryBuilder.getMany();

      // Calculate pagination info
      const pages = Math.ceil(total / limit);

      return {
        jobs,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      logger.error("Failed to get billing jobs", { error, options });
      throw error;
    }
  }

  /**
   * Retry a failed billing job
   */
  async retryBillingJob(jobId: string): Promise<BillingResult> {
    try {
      const billingJobRepo = this.billingJobRepository;

      // Get the original job
      const originalJob = await billingJobRepo.findOne({
        where: { jobId },
      });

      if (!originalJob) {
        throw new Error("Billing job not found");
      }

      if (originalJob.status !== BillingJobStatus.FAILED) {
        throw new Error("Only failed jobs can be retried");
      }

      logger.info(`Retrying billing job ${jobId}`, { jobId });

      // Create a new job with the same parameters
      const newJobId = `RETRY_${originalJob.jobId}_${uuidv4().substring(0, 8)}`;

      const result = await this.runBillingJob(
        originalJob.startDate,
        originalJob.endDate,
        "Support Queue", // No specific client for retry
        false // Not a dry run
      );

      return result;
    } catch (error) {
      logger.error(`Failed to retry billing job ${jobId}`, { error, jobId });
      throw error;
    }
  }

  /**
   * Cancel a billing job
   */
  async cancelBillingJob(jobId: string): Promise<void> {
    try {
      const billingJobRepo = this.billingJobRepository;

      // Get the job
      const job = await billingJobRepo.findOne({
        where: { jobId },
      });

      if (!job) {
        throw new Error("Billing job not found");
      }

      if (
        job.status === BillingJobStatus.COMPLETED ||
        job.status === BillingJobStatus.CANCELLED
      ) {
        throw new Error("Cannot cancel completed or already cancelled jobs");
      }

      logger.info(`Cancelling billing job ${jobId}`, {
        jobId,
        currentStatus: job.status,
      });

      // Update job status to cancelled
      await this.updateBillingJobStatus(job.id, BillingJobStatus.CANCELLED);

      logger.info(`Successfully cancelled billing job ${jobId}`);
    } catch (error) {
      logger.error(`Failed to cancel billing job ${jobId}`, { error, jobId });
      throw error;
    }
  }

  /**
   * Check if QBO service is authenticated
   */
  isQBOServiceAuthenticated(): boolean {
    return this.qboService.isAuthenticated();
  }

  /**
   * Get QBO service authentication status
   */
  getQBOServiceStatus(): { isAuthenticated: boolean; error?: string } {
    try {
      const isAuthenticated = this.qboService.isAuthenticated();
      return { isAuthenticated };
    } catch (error) {
      return {
        isAuthenticated: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
