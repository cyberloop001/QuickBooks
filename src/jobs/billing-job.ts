#!/usr/bin/env node

import "reflect-metadata";
import dotenv from "dotenv";
import { createConnection } from "typeorm";
import { BillingService } from "../services/BillingService";
import { PhoneSystemService } from "../services/PhoneSystemService";
import { logger } from "../utils/logger";
import moment from "moment-timezone";
import { config } from "../config";
import fs from "fs";
import path from "path";

// Load environment variables
dotenv.config();

interface BillingJobOptions {
  startDate?: string;
  endDate?: string;
  clientId?: string;
  isDryRun: boolean;
  csvFile?: string;
  outputFile?: string;
}

class BillingJobRunner {
  private billingService: BillingService;
  private phoneSystemService: PhoneSystemService;

  constructor() {
    this.billingService = new BillingService();
    this.phoneSystemService = new PhoneSystemService();
  }

  /**
   * Parse command line arguments
   */
  private parseArguments(): BillingJobOptions {
    const args = process.argv.slice(2);
    const options: BillingJobOptions = {
      isDryRun: false,
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case "--dry-run":
          options.isDryRun = true;
          break;
        case "--start-date":
          options.startDate = args[++i];
          break;
        case "--end-date":
          options.endDate = args[++i];
          break;
        case "--client-id":
          options.clientId = args[++i];
          break;
        case "--csv-file":
          options.csvFile = args[++i];
          break;
        case "--output-file":
          options.outputFile = args[++i];
          break;
        case "--help":
          this.showHelp();
          process.exit(0);
          break;
        default:
          if (arg.startsWith("--")) {
            console.error(`Unknown option: ${arg}`);
            this.showHelp();
            process.exit(1);
          }
      }
    }

    return options;
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log(`
Phone Billing System - Billing Job Runner

Usage: npm run billing:run [options]

Options:
  --dry-run              Run in dry-run mode (no invoices created)
  --start-date DATE      Start date for billing period (YYYY-MM-DD)
  --end-date DATE        End date for billing period (YYYY-MM-DD)
  --client-id ID         Specific client ID to bill
  --csv-file PATH        Path to CSV file with usage data
  --output-file PATH     Path to output file for results
  --help                 Show this help message

Examples:
  # Run billing for previous month
  npm run billing:run

  # Run billing for specific date range
  npm run billing:run --start-date 2025-07-01 --end-date 2025-07-31

  # Run billing for specific client
  npm run billing:run --client-id PS-1001

  # Dry run with CSV file
  npm run billing:run --dry-run --csv-file ./usage.csv --output-file ./results.json

  # Run billing for specific month
  npm run billing:run --start-date 2025-07-01 --end-date 2025-07-31 --dry-run
`);
  }

  /**
   * Run the billing job
   */
  async run(): Promise<void> {
    try {
      const options = this.parseArguments();

      logger.info("Starting billing job runner", { options });

      // Connect to database
      await this.connectToDatabase();

      let startDate: Date;
      let endDate: Date;

      if (options.csvFile) {
        // Process CSV file
        await this.processCSVFile(options.csvFile, options);
        return;
      }

      // Determine billing period
      if (options.startDate && options.endDate) {
        startDate = new Date(options.startDate);
        endDate = new Date(options.endDate);
      } else {
        // Default to previous month
        const now = moment().tz(config.billing.timezone);
        const previousMonth = now.clone().subtract(1, "month");
        startDate = previousMonth.clone().startOf("month").toDate();
        endDate = previousMonth.clone().endOf("month").toDate();
      }

      logger.info("Billing period determined", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        timezone: config.billing.timezone,
      });

      // Run billing job
      const result = await this.billingService.runBillingJob(
        startDate,
        endDate,
        options.clientId,
        options.isDryRun
      );

      // Output results
      if (options.outputFile) {
        await this.writeOutputFile(options.outputFile, result);
      } else {
        this.printResults(result);
      }

      logger.info("Billing job completed successfully", {
        jobId: result.jobId,
        totalClients: result.totalClients,
        totalInvoices: result.totalInvoices,
        totalAmount: result.totalAmount,
      });

      process.exit(0);
    } catch (error) {
      logger.error("Billing job failed", { error });
      console.error(
        "❌ Billing job failed:",
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  }

  /**
   * Process CSV file with usage data
   */
  private async processCSVFile(
    csvFilePath: string,
    options: BillingJobOptions
  ): Promise<void> {
    try {
      logger.info("Processing CSV file", { csvFilePath });

      // Read CSV file
      const csvContent = fs.readFileSync(csvFilePath, "utf-8");

      // Parse CSV data
      const usageData = this.phoneSystemService.parseCSVData(csvContent);

      logger.info("CSV data parsed", { recordCount: usageData.length });

      // Filter data for July 2025 (PST timezone)
      const julyStart = moment
        .tz("2025-07-01", config.billing.timezone)
        .startOf("month");
      const julyEnd = moment
        .tz("2025-07-01", config.billing.timezone)
        .endOf("month");

      const julyData = usageData.filter((usage) => {
        const usageDate = moment.tz(usage.started_pst, config.billing.timezone);
        return usageDate.isBetween(julyStart, julyEnd, "day", "[]");
      });

      logger.info("July data filtered", {
        totalRecords: usageData.length,
        julyRecords: julyData.length,
      });

      // Aggregate usage by client
      const aggregatedUsage = this.aggregateUsageFromCSV(julyData);

      // Generate invoice payloads
      const invoicePayloads = this.generateInvoicePayloads(aggregatedUsage);

      // Output results
      if (options.outputFile) {
        await this.writeOutputFile(options.outputFile, {
          success: true,
          jobId: "CSV_PROCESSING_" + Date.now(),
          totalClients: aggregatedUsage.size,
          totalInvoices: 0,
          totalAmount: Array.from(aggregatedUsage.values()).reduce(
            (sum, usage) => sum + usage.totalAmount,
            0
          ),
          errors: [],
          details: Array.from(aggregatedUsage.values()).map((usage) => ({
            clientId: usage.clientId,
            clientName: usage.clientId,
            totalCalls: usage.totalCalls,
            totalMinutes: usage.totalMinutes,
            totalAmount: usage.totalAmount,
            invoiceCreated: false,
          })),
          invoicePayloads,
        });
      } else {
        this.printCSVResults(aggregatedUsage, invoicePayloads);
      }
    } catch (error) {
      logger.error("Failed to process CSV file", { error, csvFilePath });
      throw new Error(
        `Failed to process CSV file: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Aggregate usage data from CSV
   */
  private aggregateUsageFromCSV(usageData: any[]): Map<string, any> {
    const aggregatedUsage = new Map<string, any>();

    for (const usage of usageData) {
      const clientId = usage.client_id;

      if (!aggregatedUsage.has(clientId)) {
        aggregatedUsage.set(clientId, {
          clientId,
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
   * Generate invoice payloads for QBO
   */
  private generateInvoicePayloads(aggregatedUsage: Map<string, any>): any[] {
    const payloads: any[] = [];

    for (const [clientId, usage] of aggregatedUsage) {
      const payload = {
        Line: [
          {
            Amount: usage.totalAmount,
            DetailType: "SalesItemLineDetail",
            SalesItemLineDetail: {
              ItemRef: {
                value: config.billing.itemId,
              },
              Qty: usage.totalMinutes,
              UnitPrice: config.billing.ratePerMinute,
            },
            Description: "Phone usage for July 2025 (PST)",
            Memo: "Billing period: 2025-07-01 to 2025-07-31 PST",
          },
        ],
        CustomerRef: {
          value: `QBO_CUSTOMER_ID_${clientId}`,
        },
        DocNumber: `INV-2025-07-${clientId}`,
        TxnDate: "2025-08-01",
        BillEmail: {
          Address: `billing@client${clientId}.com`,
        },
        ShipFromAddr: {
          Line1: "Your Company Name",
          City: "Your City",
          CountrySubDivisionCode: "CA",
          PostalCode: "12345",
        },
        CustomerMemo: {
          value: "Phone usage charges for July 2025",
        },
        PrivateNote: `Generated by automated billing system - Job ID: CSV_PROCESSING_${Date.now()}`,
      };

      payloads.push(payload);
    }

    return payloads;
  }

  /**
   * Print CSV processing results
   */
  private printCSVResults(
    aggregatedUsage: Map<string, any>,
    invoicePayloads: any[]
  ): void {
    console.log("\n📊 CSV Processing Results");
    console.log("========================");

    console.log(`\n📞 Total Clients: ${aggregatedUsage.size}`);

    let totalCalls = 0;
    let totalMinutes = 0;
    let totalAmount = 0;

    for (const [clientId, usage] of aggregatedUsage) {
      console.log(`\n👤 Client: ${clientId}`);
      console.log(`   📱 Calls: ${usage.totalCalls}`);
      console.log(`   ⏱️  Minutes: ${usage.totalMinutes}`);
      console.log(`   💰 Amount: $${usage.totalAmount}`);

      totalCalls += usage.totalCalls;
      totalMinutes += usage.totalMinutes;
      totalAmount += usage.totalAmount;
    }

    console.log(`\n📈 Totals:`);
    console.log(`   📱 Total Calls: ${totalCalls}`);
    console.log(`   ⏱️  Total Minutes: ${totalMinutes}`);
    console.log(`   💰 Total Amount: $${totalAmount}`);

    console.log(`\n📄 Invoice Payloads Generated: ${invoicePayloads.length}`);
    console.log("\n💡 Use --output-file to save results to JSON file");
  }

  /**
   * Print billing results
   */
  private printResults(result: any): void {
    console.log("\n📊 Billing Job Results");
    console.log("======================");
    console.log(`\n🆔 Job ID: ${result.jobId}`);
    console.log(`✅ Success: ${result.success}`);
    console.log(`👥 Total Clients: ${result.totalClients}`);
    console.log(`📄 Total Invoices: ${result.totalInvoices}`);
    console.log(`💰 Total Amount: $${result.totalAmount}`);

    if (result.errors.length > 0) {
      console.log(`\n❌ Errors:`);
      result.errors.forEach((error: string) => console.log(`   - ${error}`));
    }

    if (result.details.length > 0) {
      console.log(`\n📋 Client Details:`);
      result.details.forEach((detail: any) => {
        console.log(`\n👤 ${detail.clientName} (${detail.clientId})`);
        console.log(`   📱 Calls: ${detail.totalCalls}`);
        console.log(`   ⏱️  Minutes: ${detail.totalMinutes}`);
        console.log(`   💰 Amount: $${detail.totalAmount}`);
        console.log(
          `   📄 Invoice: ${detail.invoiceCreated ? "✅ Created" : "❌ Failed"}`
        );
        if (detail.error) {
          console.log(`   ❌ Error: ${detail.error}`);
        }
      });
    }
  }

  /**
   * Write results to output file
   */
  private async writeOutputFile(filePath: string, data: any): Promise<void> {
    try {
      const outputDir = path.dirname(filePath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`\n💾 Results saved to: ${filePath}`);
    } catch (error) {
      logger.error("Failed to write output file", { error, filePath });
      throw new Error(
        `Failed to write output file: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Connect to database
   */
  private async connectToDatabase(): Promise<void> {
    try {
      await createConnection({
        type: "postgres",
        host: config.database.host,
        port: config.database.port,
        username: config.database.user,
        password: config.database.password,
        database: config.database.name,
        ssl: config.database.ssl,
        entities: [__dirname + "/../entities/**/*.js"],
        synchronize: false,
        logging: false,
      });

      logger.info("Database connection established");
    } catch (error) {
      logger.error("Failed to connect to database", { error });
      console.warn(
        "⚠️  Database connection failed, continuing with CSV processing only"
      );
    }
  }
}

// Run the billing job
const runner = new BillingJobRunner();
runner.run().catch((error) => {
  console.error("❌ Fatal error:", error.message);
  process.exit(1);
});
