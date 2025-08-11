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
import { setupScheduledJobs } from "./jobs/scheduler";
import { config } from "./config";

// Load environment variables
dotenv.config();

const app = express();
const PORT = config.server.port;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.security.corsOrigin,
    credentials: true,
  })
);

// Request logging
app.use(
  morgan("combined", {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
app.use(rateLimiter);

// Kill switch middleware
app.use(killSwitchMiddleware);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: config.server.environment,
    killSwitchEnabled: config.killSwitch.enabled,
  });
});

// Setup routes
setupRoutes(app);

// Error handling middleware (must be last)
app.use(errorHandler);

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
      entities: [__dirname + "/entities/**/*.js"],
      migrations: [__dirname + "/database/migrations/**/*.js"],
      synchronize: config.server.environment === "development",
      logging: config.server.environment === "development",
    });

    logger.info("Database connection established");

    // Setup scheduled jobs
    await setupScheduledJobs();

    // Start server
    app.listen(PORT, () => {
      logger.info(
        `Server running on port ${PORT} in ${config.server.environment} mode`
      );
      logger.info(`Health check available at http://localhost:${PORT}/health`);
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
