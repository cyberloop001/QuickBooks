#!/usr/bin/env node

/**
 * Health check script for Docker
 * This script checks if the application is running and responding
 */

import { createConnection } from "typeorm";
import { config } from "./config";

async function healthCheck() {
  try {
    // Try to connect to the database
    const connection = await createConnection({
      type: "postgres",
      host: config.database.host,
      port: config.database.port,
      username: config.database.user,
      password: config.database.password,
      database: config.database.name,
      ssl: config.database.ssl,
      entities: [__dirname + "/entities/**/*.js"],
      synchronize: false, // Don't sync during health check
      logging: false,
    });

    // Test a simple query
    await connection.query("SELECT 1");

    // Close the connection
    await connection.close();

    console.log("Health check passed");
    process.exit(0);
  } catch (error) {
    console.error("Health check failed:", error);
    process.exit(1);
  }
}

// Run health check
healthCheck();
