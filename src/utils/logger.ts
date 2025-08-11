import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { config } from "../config";

// Create logs directory if it doesn't exist
const fs = require("fs");
const logDir = path.resolve(config.logging.filePath);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = "";
    if (Object.keys(meta).length > 0) {
      metaStr = ` ${JSON.stringify(meta)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
export const logger = winston.createLogger({
  level: config.logging.level,
  format: fileFormat,
  defaultMeta: { service: "phone-billing-system" },
  transports: [
    // Error log file
    new DailyRotateFile({
      filename: path.join(logDir, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
      format: fileFormat,
    }),

    // Combined log file
    new DailyRotateFile({
      filename: path.join(logDir, "combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
      format: fileFormat,
    }),
  ],
});

// Add console transport in development
if (config.server.environment === "development") {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Create a stream for Morgan HTTP logging
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Helper functions for structured logging
export const logBillingJob = (jobId: string, action: string, details: any) => {
  logger.info("Billing job action", {
    jobId,
    action,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

export const logQBOAction = (action: string, details: any) => {
  logger.info("QBO API action", {
    action,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

export const logPhoneSystemAction = (action: string, details: any) => {
  logger.info("Phone system API action", {
    action,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

export const logError = (error: Error, context: any = {}) => {
  logger.error("Application error", {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    context,
    timestamp: new Date().toISOString(),
  });
};

// Export default logger
export default logger;
