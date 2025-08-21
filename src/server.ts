import "reflect-metadata";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { createConnection } from "typeorm";
import { logger } from "./utils/logger";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";
import { killSwitchMiddleware } from "./middleware/killSwitch";
import { setupRoutes } from "./routes";
import { JobScheduler } from "./jobs/scheduler";
import { config } from "./config";

// Load environment variables
dotenv.config();

const app = express();
const PORT = config.server.port;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin:
      config.server.environment === "development"
        ? ["http://localhost:3000", "http://127.0.0.1:3000"]
        : [config.server.baseUrl],
    credentials: true,
  })
);

// Request logging
if (config.server.environment === "development") {
  app.use(morgan("combined"));
}

// Rate limiting
app.use(rateLimiter);

// Kill switch middleware
app.use(killSwitchMiddleware);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint (available before database connection)
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.environment,
    version: "1.0.0",
  });
});

// Database connection and server startup
async function startServer() {
  try {
    // Connect to database
    await createConnection({
      type: "postgres",
      host: config.database.host,
      port: config.database.port,
      username: config.database.user,
      password: config.database.password,
      database: config.database.name,
      ssl: config.database.ssl,
      entities: [__dirname + "/entities/**/*.ts"],
      migrations: [__dirname + "/database/migrations/**/*.ts"],
      synchronize: config.server.environment === "development",
      logging: config.server.environment === "development",
    });

    logger.info("Database connection established");

    // Setup routes AFTER database connection is established
    setupRoutes(app);

    // Error handling middleware (must be last)
    app.use(errorHandler);

    // Setup scheduled jobs
    const jobScheduler = new JobScheduler();
    await jobScheduler.setupScheduledJobs();

    // Start server
    app.listen(PORT, () => {
      logger.info(
        `Server running on port ${PORT} in ${config.server.environment} mode`
      );
      logger.info(`Health check available at http://localhost:${PORT}/health`);
      logger.info(`API available at http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

// Start the server
startServer();
