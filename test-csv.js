#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Sample CSV data (from the provided file)
const csvData = `call_id,client_id,started_at,ended_at,billable_seconds,started_pst,ended_pst
PS-1001-5012,PS-1001,2025-07-03 19:47:00+00:00,2025-07-03 19:52:41+00:00,341,2025-07-03 12:47:00-07:00,2025-07-03 12:52:41-07:00
PS-1001-7912,PS-1001,2025-07-05 23:06:00+00:00,2025-07-05 23:08:29+00:00,149,2025-07-05 16:06:00-07:00,2025-07-05 16:08:29-07:00
PS-1001-9279,PS-1001,2025-07-01 02:13:00+00:00,2025-07-01 02:17:58+00:00,298,2025-06-30 19:13:00-07:00,2025-06-30 19:17:58-07:00
PS-1001-4611,PS-1001,2025-07-01 12:12:00+00:00,2025-07-01 12:20:09+00:00,489,2025-07-01 05:12:00-07:00,2025-07-01 05:20:09-07:00
PS-1001-3615,PS-1001,2025-07-19 12:51:00+00:00,2025-07-19 12:52:06+00:00,66,2025-07-19 05:51:00-07:00,2025-07-19 05:52:06-07:00
PS-1001-4527,PS-1001,2025-07-14 05:17:00+00:00,2025-07-14 05:20:39+00:00,219,2025-07-13 22:17:00-07:00,2025-07-13 22:20:39-07:00
PS-1001-6881,PS-1001,2025-07-04 06:24:00+00:00,2025-07-04 06:26:39+00:00,159,2025-07-04 06:24:00+00:00,2025-07-04 06:26:39+00:00
PS-1001-8527,PS-1001,2025-07-20 12:51:00+00:00,2025-07-20 12:52:44+00:00,104,2025-07-20 05:51:00-07:00,2025-07-20 05:52:44-07:00
PS-1002-6925,PS-1002,2025-07-04 07:05:00+00:00,2025-07-04 07:11:00+00:00,360,2025-07-04 00:05:00-07:00,2025-07-04 00:11:00-07:00
PS-1002-4733,PS-1002,2025-07-07 17:04:00+00:00,2025-07-07 17:05:46+00:00,106,2025-07-07 10:04:00-07:00,2025-07-07 10:05:46-07:00
PS-1002-7227,PS-1002,2025-07-03 11:55:00+00:00,2025-07-03 11:57:43+00:00,163,2025-07-03 04:55:00-07:00,2025-07-03 04:57:43-07:00
PS-1002-3664,PS-1002,2025-07-16 00:53:00+00:00,2025-07-16 01:00:13+00:00,433,2025-07-15 17:53:00-07:00,2025-07-15 18:00:13-07:00
PS-1002-2169,PS-1002,2025-07-12 10:42:00+00:00,2025-07-12 10:47:33+00:00,333,2025-07-12 03:42:00-07:00,2025-07-12 03:47:33-07:00
PS-1002-3677,PS-1002,2025-07-21 00:34:00+00:00,2025-07-21 00:39:10+00:00,310,2025-07-20 17:34:00-07:00,2025-07-20 17:39:10-07:00
PS-1002-6313,PS-1002,2025-07-13 12:59:00+00:00,2025-07-13 13:03:44+00:00,284,2025-07-13 05:59:00-07:00,2025-07-13 06:03:44-07:00
PS-1002-7572,PS-1002,2025-07-08 01:51:00+00:00,2025-07-08 01:57:23+00:00,383,2025-07-07 18:51:00-07:00,2025-07-07 18:57:23-07:00
PS-1003-4483,PS-1003,2025-07-03 10:58:00+00:00,2025-07-03 11:04:22+00:00,382,2025-07-03 03:58:00-07:00,2025-07-03 04:04:22-07:00
PS-1003-3340,PS-1003,2025-07-16 07:56:00+00:00,2025-07-16 08:04:49+00:00,529,2025-07-16 00:56:00-07:00,2025-07-16 01:04:49-07:00
PS-1003-8019,PS-1003,2025-07-05 11:47:00+00:00,2025-07-05 11:52:29+00:00,329,2025-07-05 04:47:00-07:00,2025-07-05 04:52:29-07:00
PS-1003-9348,PS-1003,2025-07-13 06:14:00+00:00,2025-07-13 06:17:21+00:00,201,2025-07-12 23:14:00-07:00,2025-07-12 23:17:21-07:00
PS-1003-3504,PS-1003,2025-07-03 05:55:00+00:00,2025-07-03 05:57:52+00:00,172,2025-07-02 22:55:00-07:00,2025-07-02 22:57:52-07:00
PS-1003-7304,PS-1003,2025-07-06 16:27:00+00:00,2025-07-06 16:29:05+00:00,125,2025-07-06 09:27:00-07:00,2025-07-06 09:29:05-07:00
PS-1003-1188,PS-1003,2025-07-20 18:33:00+00:00,2025-07-20 18:38:17+00:00,317,2025-07-20 11:33:00-07:00,2025-07-20 11:38:17-07:00
PS-1003-6573,PS-1003,2025-07-23 22:43:00+00:00,2025-07-23 22:48:33+00:00,333,2025-07-23 15:43:00-07:00,2025-07-23 15:48:33-07:00`;

// Parse CSV data
function parseCSVData(csvContent) {
  const lines = csvContent.trim().split("\n");
  const headers = lines[0].split(",");
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const record = {};

    headers.forEach((header, index) => {
      record[header.trim()] = values[index]?.trim();
    });

    data.push(record);
  }

  return data;
}

// Aggregate usage by client for July (PST timezone)
function aggregateUsageByClient(usageData) {
  const aggregatedUsage = new Map();

  for (const usage of usageData) {
    const clientId = usage.client_id;

    // Check if usage is in July 2025 (PST timezone)
    const startedPst = new Date(usage.started_pst);
    const julyStart = new Date("2025-07-01T00:00:00-07:00");
    const julyEnd = new Date("2025-07-31T23:59:59-07:00");

    if (startedPst >= julyStart && startedPst <= julyEnd) {
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
      clientUsage.totalSeconds += parseInt(usage.billable_seconds);
      clientUsage.totalMinutes += parseInt(usage.billable_seconds) / 60;
      clientUsage.totalAmount += (parseInt(usage.billable_seconds) / 60) * 1.0; // $1.00 per minute
      clientUsage.calls.push(usage);
    }
  }

  // Round totals to 2 decimal places
  for (const [clientId, usage] of aggregatedUsage) {
    usage.totalMinutes = Math.round(usage.totalMinutes * 100) / 100;
    usage.totalAmount = Math.round(usage.totalAmount * 100) / 100;
  }

  return aggregatedUsage;
}

// Generate QBO invoice payloads
function generateInvoicePayloads(aggregatedUsage) {
  const payloads = [];

  for (const [clientId, usage] of aggregatedUsage) {
    const payload = {
      Line: [
        {
          Amount: usage.totalAmount,
          DetailType: "SalesItemLineDetail",
          SalesItemLineDetail: {
            ItemRef: {
              value: "PHONE_USAGE_ITEM_ID",
            },
            Qty: usage.totalMinutes,
            UnitPrice: 1.0,
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

// Main execution
function main() {
  console.log("📊 Phone Billing System - CSV Processing Test");
  console.log("=============================================\n");

  try {
    // Parse CSV data
    console.log("📋 Parsing CSV data...");
    const usageData = parseCSVData(csvData);
    console.log(`✅ Parsed ${usageData.length} records\n`);

    // Aggregate usage by client for July
    console.log("🔍 Filtering July 2025 data (PST timezone)...");
    const aggregatedUsage = aggregateUsageByClient(usageData);
    console.log(`✅ Found ${aggregatedUsage.size} clients with July usage\n`);

    // Generate invoice payloads
    console.log("📄 Generating QBO invoice payloads...");
    const invoicePayloads = generateInvoicePayloads(aggregatedUsage);
    console.log(`✅ Generated ${invoicePayloads.length} invoice payloads\n`);

    // Display results
    console.log("📊 Aggregated Results for July 2025 (PST)");
    console.log("==========================================");

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

    // Save results to file
    const results = {
      success: true,
      jobId: "CSV_PROCESSING_" + Date.now(),
      totalClients: aggregatedUsage.size,
      totalInvoices: 0,
      totalAmount: totalAmount,
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
    };

    const outputFile = "csv-processing-results.json";
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${outputFile}`);

    // Display sample invoice payload
    if (invoicePayloads.length > 0) {
      console.log(
        `\n📄 Sample Invoice Payload for ${invoicePayloads[0].CustomerRef.value}:`
      );
      console.log(JSON.stringify(invoicePayloads[0], null, 2));
    }
  } catch (error) {
    console.error("❌ Error processing CSV:", error.message);
    process.exit(1);
  }
}

// Run the test
main();
