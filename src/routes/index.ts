import { Router, Application } from "express";
import { billingRoutes } from "./billing";
import { customerProfileRoutes } from "./customerProfiles";
import { qboRoutes } from "./qbo";
import { genesysRoutes } from "./genesys";
import { dashboardRoutes } from "./dashboard";
import { healthRoutes } from "./health";

export function setupRoutes(app: Application): void {
  // API version prefix
  const apiRouter = Router();

  // Mount individual route modules
  apiRouter.use("/billing", billingRoutes);
  apiRouter.use("/customer-profiles", customerProfileRoutes);
  apiRouter.use("/qbo", qboRoutes);
  apiRouter.use("/genesys", genesysRoutes);
  apiRouter.use("/dashboard", dashboardRoutes);
  apiRouter.use("/health", healthRoutes);

  // Mount API routes
  app.use("/api/v1", apiRouter);

  // Root endpoint
  app.get("/", (req, res) => {
    res.json({
      message: "Phone Billing System API",
      version: "1.0.0",
      endpoints: {
        billing: "/api/v1/billing",
        customerProfiles: "/api/v1/customer-profiles",
        qbo: "/api/v1/qbo",
        genesys: "/api/v1/genesys",
        dashboard: "/api/v1/dashboard",
        health: "/api/v1/health",
      },
    });
  });
}
