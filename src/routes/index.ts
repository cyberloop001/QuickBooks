import { Router, Application } from "express";
import { billingRoutes } from "./billing";
import { customerProfileRoutes } from "./customerProfiles";
import { qboRoutes } from "./qbo";
import { genesysRoutes } from "./genesys";
import { dashboardRoutes } from "./dashboard";
import { healthRoutes } from "./health";
import { regionsRouter } from "./regions";
import { teamsRouter } from "./teams";
import { queueAssignmentsRouter } from "./queueAssignments";

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
  apiRouter.use("/regions", regionsRouter);
  apiRouter.use("/teams", teamsRouter);
  apiRouter.use("/queue-assignments", queueAssignmentsRouter);

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
        regions: "/api/v1/regions",
        teams: "/api/v1/teams",
        queueAssignments: "/api/v1/queue-assignments",
      },
    });
  });
}
