import { getRepository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import moment from "moment-timezone";
import { Client } from "../entities/Client";
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
            client_id: clientId || record.userId || "unknown",
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
            {
              error: genesysError,
            }
          );
        }
      }

      // If no Genesys data, log warning
      if (usageData.length === 0) {
        logger.warn("No call data available from Genesys Cloud Analytics API", {
          startDate,
          endDate,
          clientId,
        });
      }

      // Store usage data in database
      await this.storePhoneUsageData(usageData);

      return usageData;
    } catch (error) {
      logger.error("Failed to fetch phone usage data", {
        error,
        startDate,
        endDate,
        clientId,
      });
      throw new Error(
        `Failed to fetch phone usage data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Store phone usage data in database
   */
  private async storePhoneUsageData(usageData: any[]): Promise<void> {
    const phoneUsageRepo = getRepository(PhoneUsage);

    for (const usage of usageData) {
      // Check if usage already exists
      const existingUsage = await phoneUsageRepo.findOne({
        where: { callId: usage.call_id },
      });

      if (!existingUsage) {
        const phoneUsage = new PhoneUsage();
        phoneUsage.callId = usage.call_id;
        phoneUsage.clientId = usage.client_id;
        phoneUsage.startedAt = new Date(usage.started_at);
        phoneUsage.endedAt = new Date(usage.ended_at);
        phoneUsage.billableSeconds = usage.billable_seconds;
        phoneUsage.startedPst = new Date(usage.started_pst);
        phoneUsage.endedPst = new Date(usage.ended_pst);
        phoneUsage.billableMinutes =
          Math.round((usage.billable_seconds / 60) * 100) / 100;
        phoneUsage.amount =
          Math.round(
            phoneUsage.billableMinutes * config.billing.ratePerMinute * 100
          ) / 100;

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
    const clientRepo = getRepository(Client);
    const aggregatedUsage = new Map<string, any>();

    for (const usage of usageData) {
      const clientId = usage.client_id;

      if (!aggregatedUsage.has(clientId)) {
        // Get client details
        const client = await clientRepo.findOne({
          where: { genesysClientId: clientId },
        });

        if (!client) {
          logger.warn(`Client not found for phone system ID: ${clientId}`);
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
      clientUsage.totalAmount +=
        (usage.billable_seconds / 60) * config.billing.ratePerMinute;
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
    const { client, totalCalls, totalMinutes, totalAmount } = usage;

    // Check if invoice already exists for this client and period
    if (!isDryRun) {
      const existingInvoice = await this.qboService.findExistingInvoice(
        client.qboCustomerId,
        billingJob.startDate,
        billingJob.endDate,
        billingJob.jobId
      );

      if (existingInvoice) {
        logger.info(`Invoice already exists for client ${client.id}`, {
          clientId: client.id,
          invoiceId: existingInvoice.Id,
          jobId: billingJob.jobId,
        });

        return {
          clientId: client.id,
          clientName: client.name,
          totalCalls,
          totalMinutes,
          totalAmount,
          invoiceCreated: true,
          invoiceId: existingInvoice.Id,
        };
      }
    }

    // Create invoice payload
    const invoicePayload = await this.createInvoicePayload(
      client,
      totalMinutes,
      totalAmount,
      billingJob
    );

    let invoiceId: string | undefined;

    if (!isDryRun) {
      // Create invoice in QBO
      const invoice = await this.qboService.createInvoice(invoicePayload);
      invoiceId = invoice.Id;

      // Mark phone usage as billed
      await this.markUsageAsBilled(usage.calls, billingJob.id, invoiceId);
    }

    return {
      clientId: client.id,
      clientName: client.name,
      totalCalls,
      totalMinutes,
      totalAmount,
      invoiceCreated: !isDryRun,
      invoiceId,
    };
  }

  /**
   * Create invoice payload for QBO
   */
  private async createInvoicePayload(
    client: Client,
    totalMinutes: number,
    totalAmount: number,
    billingJob: BillingJob
  ): Promise<any> {
    const billingPeriod = `${
      billingJob.startDate.toISOString().split("T")[0]
    } to ${billingJob.endDate.toISOString().split("T")[0]}`;

    // Get company information for invoice header
    let companyInfo: any = null;
    try {
      companyInfo = await this.qboService.getCompanyInfo();
    } catch (error) {
      logger.warn("Failed to get company info for invoice, using defaults", {
        error,
      });
    }

    // Build ShipFromAddr from company information or use defaults
    const shipFromAddr = companyInfo?.CompanyAddr
      ? {
          Line1: companyInfo.CompanyAddr.Line1 || "Your Company Name",
          City: companyInfo.CompanyAddr.City || "Your City",
          CountrySubDivisionCode:
            companyInfo.CompanyAddr.CountrySubDivisionCode || "CA",
          PostalCode: companyInfo.CompanyAddr.PostalCode || "12345",
          Country: companyInfo.CompanyAddr.Country || "US",
        }
      : {
          Line1: client.address || "Your Company Name",
          City: client.city || "Your City",
          CountrySubDivisionCode: client.state || "CA",
          PostalCode: client.zipCode || "12345",
          Country: client.country || "US",
        };

    return {
      Line: [
        {
          Amount: totalAmount,
          DetailType: "SalesItemLineDetail",
          SalesItemLineDetail: {
            ItemRef: {
              value: config.billing.itemId,
            },
            Qty: totalMinutes,
            UnitPrice: config.billing.ratePerMinute,
          },
          Description: `Phone usage for ${moment(billingJob.startDate).format(
            "MMMM YYYY"
          )} (PST)`,
          Memo: `Billing period: ${billingPeriod} PST`,
        },
      ],
      CustomerRef: {
        value: client.qboCustomerId,
      },
      DocNumber: `INV-${moment(billingJob.startDate).format("YYYY-MM")}-${
        client.genesysClientId
      }`,
      TxnDate: moment(billingJob.endDate).add(1, "day").format("YYYY-MM-DD"),
      BillEmail: client.email ? { Address: client.email } : undefined,
      ShipFromAddr: shipFromAddr,
      CustomerMemo: {
        value: `Phone usage charges for ${moment(billingJob.startDate).format(
          "MMMM YYYY"
        )}`,
      },
      PrivateNote: `Generated by automated billing system - Job ID: ${billingJob.jobId}`,
    };
  }

  /**
   * Mark phone usage records as billed
   */
  private async markUsageAsBilled(
    calls: any[],
    billingJobId: string,
    invoiceId: string
  ): Promise<void> {
    const phoneUsageRepo = getRepository(PhoneUsage);

    for (const call of calls) {
      await phoneUsageRepo.update(
        { callId: call.call_id },
        {
          isBilled: true,
          billingJobId,
          qboInvoiceId: invoiceId,
          billedAt: new Date(),
        }
      );
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
      totalClients: results.length,
      totalInvoices: invoicesCreated,
      totalAmount,
      successfulInvoices: invoicesCreated,
      failedInvoices: invoicesFailed,
    });
  }
}
