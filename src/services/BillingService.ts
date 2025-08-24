import { getRepository, Repository } from "typeorm";
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
import { GenesysService } from "./GenesysService";
import { logger, logBillingJob } from "../utils/logger";
import { config } from "../config";

export interface BillingResult {
  success: boolean;
  jobId: string;
  totalClients: number;
  totalInvoices: number;
  totalAmount: number;
  errors: string[];
  details: ClientBillingResult[];
}

export interface ClientBillingResult {
  clientId: string;
  clientName: string;
  totalCalls: number;
  totalMinutes: number;
  totalAmount: number;
  invoiceCreated: boolean;
  invoiceId?: string;
  error?: string;
}

export class BillingService {
  private qboService: QBOService;
  private genesysService: GenesysService;

  constructor() {
    this.qboService = new QBOService();
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
    clientId?: string,
    isDryRun: boolean = false
  ): Promise<BillingResult> {
    const jobId = `BILL_${moment(billingPeriodStart).format(
      "YYYY_MM"
    )}_${uuidv4().substring(0, 8)}`;
    const jobType = isDryRun ? BillingJobType.DRY_RUN : BillingJobType.MONTHLY;

    logger.info(`Starting billing job ${jobId}`, {
      jobId,
      type: jobType,
      periodStart: billingPeriodStart,
      periodEnd: billingPeriodEnd,
      clientId,
      isDryRun,
    });

    // Create billing job record
    const billingJob = await this.createBillingJob(
      jobId,
      jobType,
      billingPeriodStart,
      billingPeriodEnd,
      clientId
    );

    try {
      // Update job status to in progress
      await this.updateBillingJobStatus(
        billingJob.id,
        BillingJobStatus.IN_PROGRESS
      );

      // Fetch phone usage data
      const phoneUsageData = await this.fetchPhoneUsageData(
        billingPeriodStart,
        billingPeriodEnd,
        clientId
      );

      // Aggregate usage by client
      const aggregatedUsage = await this.aggregateUsageByClient(
        phoneUsageData,
        billingPeriodStart,
        billingPeriodEnd
      );

      // Create invoices (or simulate for dry run)
      const billingResults = await this.processClientBilling(
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
        totalClients: billingResults.length,
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
    clientId?: string
  ): Promise<any[]> {
    try {
      let usageData: any[] = [];

      // Try Genesys Cloud first if configured
      if (config.genesys.clientId && config.genesys.clientSecret) {
        try {
          logger.info(
            "Fetching billing call data from Genesys Cloud Analytics API..."
          );

          // Use the optimized billing method that groups data by client
          const billingData = await this.genesysService.getBillingCallData(
            startDate,
            endDate,
            clientId ? [clientId] : undefined
          );

          // Convert Genesys data to billing format
          usageData = billingData.callRecords.map((record) => ({
            call_id: record.conversationId,
            customerProfileId: clientId || record.userId || "unknown",
            started_at: record.startTime,
            ended_at: record.endTime,
            billable_seconds: record.duration,
            started_pst: record.startTime, // Genesys provides UTC, convert if needed
            ended_pst: record.endTime,
            source: "genesys",
            wrap_up_code: record.wrapUpCode,
            recording_id: record.recordingId,
            user_id: record.userId,
            queue_id: record.queueId,
          }));

          logger.info(
            "Successfully fetched billing data from Genesys Cloud Analytics API",
            {
              count: usageData.length,
              totalHits: billingData.aggregations.totalCalls,
              clientsCount: Object.keys(billingData.aggregations.byClient)
                .length,
              totalMinutes: billingData.aggregations.totalMinutes,
              startDate,
              endDate,
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

          if (clientId) {
            usageQuery.andWhere("usage.clientId = :clientId", { clientId });
          }

          const phoneUsageData = await usageQuery.getMany();

          usageData = phoneUsageData.map((usage) => ({
            call_id: usage.callId,
            customerProfileId: usage.customerProfileId,
            started_at: usage.startedAt,
            ended_at: usage.endedAt,
            billable_seconds: usage.billableSeconds,
            started_pst: usage.startedPst,
            ended_pst: usage.endedPst,
            source: "phone_system",
          }));

          logger.info("Successfully fetched phone usage data", {
            count: usageData.length,
            startDate,
            endDate,
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
   * Process billing for each client
   */
  private async processClientBilling(
    aggregatedUsage: Map<string, any>,
    billingJob: BillingJob,
    isDryRun: boolean
  ): Promise<ClientBillingResult[]> {
    const results: ClientBillingResult[] = [];

    for (const [clientId, usage] of aggregatedUsage) {
      try {
        const result = await this.processSingleClientBilling(
          usage,
          billingJob,
          isDryRun
        );
        results.push(result);
      } catch (error) {
        logger.error(`Failed to process billing for client ${clientId}`, {
          error,
          clientId,
        });

        results.push({
          clientId,
          clientName: usage.client.name || clientId,
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
   * Process billing for a single client
   */
  private async processSingleClientBilling(
    usage: any,
    billingJob: BillingJob,
    isDryRun: boolean
  ): Promise<ClientBillingResult> {
    try {
      const clientRepo = this.customerProfileRepository;
      const client = await clientRepo.findOne({
        where: { id: usage.customerProfileId },
      });

      if (!client) {
        return {
          clientId: usage.customerProfileId,
          clientName: "Unknown Customer",
          totalCalls: 0,
          totalMinutes: 0,
          totalAmount: 0,
          invoiceCreated: false,
          error: "Customer profile not found",
        };
      }

      // Calculate billing amounts
      const totalMinutes = usage.billable_seconds / 60;
      const totalAmount = totalMinutes * client.ratePerMinute;

      let invoiceId: string | undefined;
      let invoiceCreated = false;

      if (!isDryRun) {
        try {
          // Create invoice in QBO
          const invoicePayload = await this.createInvoicePayload(
            client,
            totalMinutes,
            totalAmount,
            billingJob
          );

          const invoice = await this.qboService.createInvoice(invoicePayload);
          invoiceId = invoice.Id;
          invoiceCreated = true;

          logger.info("Invoice created successfully", {
            clientId: client.id,
            clientName: client.qboDisplayName,
            invoiceId,
            totalAmount,
          });
        } catch (invoiceError) {
          logger.error("Failed to create invoice", {
            error: invoiceError,
            clientId: client.id,
            clientName: client.qboDisplayName,
          });

          return {
            clientId: client.id,
            clientName: client.qboDisplayName,
            totalCalls: 1,
            totalMinutes,
            totalAmount,
            invoiceCreated: false,
            error:
              invoiceError instanceof Error
                ? invoiceError.message
                : "Unknown error",
          };
        }
      }

      return {
        clientId: client.id,
        clientName: client.qboDisplayName,
        totalCalls: 1,
        totalMinutes,
        totalAmount,
        invoiceCreated: !isDryRun,
        invoiceId,
      };
    } catch (error) {
      logger.error("Failed to process client billing", { error, usage });
      throw error;
    }
  }

  /**
   * Create invoice payload for QBO
   */
  private async createInvoicePayload(
    client: CustomerProfile,
    totalMinutes: number,
    totalAmount: number,
    billingJob: BillingJob
  ): Promise<any> {
    try {
      // Get company info for invoice header
      let companyInfo: any = null;
      try {
        companyInfo = await this.qboService.getCompanyInfo();
      } catch (error) {
        logger.warn("Failed to get company info, using default values", {
          error,
        });
      }

      const invoicePayload = {
        Line: [
          {
            Amount: totalAmount,
            DetailType: "SalesItemLineDetail",
            SalesItemLineDetail: {
              ItemRef: {
                value: config.billing.itemId || "PHONE_USAGE",
              },
              Qty: totalMinutes,
              UnitPrice: client.ratePerMinute,
            },
          },
        ],
        CustomerRef: {
          value: client.qboCustomerId,
        },
        DocNumber: `INV-${billingJob.jobId}-${client.id}`,
        PrivateNote: `Phone usage billing for ${client.qboDisplayName}. Job ID: ${billingJob.jobId}`,
        ShipFromAddr: companyInfo?.CompanyAddr || {
          Line1: "Default Company Address",
          City: "Default City",
          CountrySubDivisionCode: "CA",
          Country: "US",
        },
        BillEmail: {
          Address: client.qboPrimaryEmailAddr || companyInfo?.Email?.Address,
        },
        ShipAddr: {
          Line1: client.qboLine1 || "No address provided",
          City: client.qboCity || "No city provided",
          CountrySubDivisionCode: client.qboCountrySubDivisionCode || "CA",
          Country: client.qboCountry || "US",
        },
      };

      return invoicePayload;
    } catch (error) {
      logger.error("Failed to create invoice payload", {
        error,
        client,
        totalMinutes,
        totalAmount,
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
   * Create billing job record
   */
  private async createBillingJob(
    jobId: string,
    type: BillingJobType,
    startDate: Date,
    endDate: Date,
    clientId?: string
  ): Promise<BillingJob> {
    const billingJobRepo = getRepository(BillingJob);

    const billingJob = new BillingJob();
    billingJob.jobId = jobId;
    billingJob.type = type;
    billingJob.status = BillingJobStatus.PENDING;
    billingJob.startDate = startDate;
    billingJob.endDate = endDate;
    billingJob.startedAt = new Date();

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
    results: ClientBillingResult[]
  ): Promise<void> {
    const billingJobRepo = getRepository(BillingJob);

    const totalCalls = results.reduce((sum, r) => sum + r.totalCalls, 0);
    const totalMinutes = results.reduce((sum, r) => sum + r.totalMinutes, 0);
    const totalAmount = results.reduce((sum, r) => sum + r.totalAmount, 0);
    const invoicesCreated = results.filter((r) => r.invoiceCreated).length;
    const invoicesFailed = results.filter((r) => r.error).length;

    await billingJobRepo.update(jobId, {
      totalCustomers: results.length,
      totalInvoices: invoicesCreated,
      totalAmount,
      successfulInvoices: invoicesCreated,
      failedInvoices: invoicesFailed,
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
        undefined, // No specific client for retry
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
}
