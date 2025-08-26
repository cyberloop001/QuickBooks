import dotenv from "dotenv";

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || "3001", 10),
    environment: process.env.NODE_ENV || "development",
    baseUrl: process.env.API_BASE_URL || "http://localhost:3001",
  },
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    name: process.env.DB_NAME || "phone_billing",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    ssl: process.env.DB_SSL === "true",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "fallback_secret_change_in_production",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  },
  qbo: {
    clientId: process.env.QBO_CLIENT_ID || "",
    clientSecret: process.env.QBO_CLIENT_SECRET || "",
    redirectUri: process.env.QBO_REDIRECT_URI || "",
    environment: process.env.QBO_ENVIRONMENT || "sandbox",
    accountId: process.env.QBO_ACCOUNT_ID || "",
    scope: process.env.QBO_SCOPE || "com.intuit.quickbooks.accounting",
    webhookVerifier: process.env.QBO_WEBHOOK_VERIFIER || "",
  },

  genesys: {
    baseUrl: process.env.GENESYS_BASE_URL || "https://api.mypurecloud.com",
    clientId: process.env.GENESYS_CLIENT_ID || "",
    clientSecret: process.env.GENESYS_CLIENT_SECRET || "",
    organizationId: process.env.GENESYS_ORG_ID || "",
  },
  billing: {
    currency: process.env.BILLING_CURRENCY || "USD",
    timezone: process.env.BILLING_TIMEZONE || "America/Los_Angeles",
    itemId: process.env.BILLING_ITEM_ID || "1",
    itemName: process.env.BILLING_ITEM_NAME || "Services",
    taxCode: process.env.BILLING_TAX_CODE || "",
  },
  logging: {
    level: process.env.LOG_LEVEL || "info",
    filePath: process.env.LOG_FILE_PATH || "./logs",
    maxSize: process.env.LOG_MAX_SIZE || "20m",
    maxFiles: process.env.LOG_MAX_FILES || "14d",
  },
  alerts: {
    smtp: {
      host: process.env.SMTP_HOST || "",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
    email: process.env.ALERT_EMAIL || "",
    slackWebhook: process.env.SLACK_WEBHOOK_URL || "",
  },
  security: {
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
    rateLimitWindowMs: parseInt(
      process.env.RATE_LIMIT_WINDOW_MS || "900000",
      10
    ),
    rateLimitMaxRequests: parseInt(
      process.env.RATE_LIMIT_MAX_REQUESTS || "100",
      10
    ),
  },
  killSwitch: {
    enabled: process.env.KILL_SWITCH_ENABLED === "true",
    reason: process.env.KILL_SWITCH_REASON || "",
  },
};

// Validation
export function validateConfig(): void {
  const requiredFields = [
    "QBO_CLIENT_ID",
    "QBO_CLIENT_SECRET",
    "PHONE_API_BASE_URL",
    "PHONE_API_KEY",
    "PHONE_API_SECRET",
    "BILLING_ITEM_ID",
  ];

  const missingFields = requiredFields.filter((field) => !process.env[field]);

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingFields.join(", ")}`
    );
  }
}
