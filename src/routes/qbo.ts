import { Router, Request, Response } from "express";
import { QBOService } from "../services/QBOService";
import { logger } from "../utils/logger";

const router = Router();
const qboService = new QBOService();

/**
 * GET /qbo/auth - Get OAuth authorization URL
 */
router.get("/auth", async (req: Request, res: Response) => {
  try {
    const authUrl = qboService.getAuthorizationUrl();

    res.json({
      success: true,
      data: {
        authUrl,
        message: "Redirect user to this URL to authorize QBO access",
      },
    });
  } catch (error) {
    logger.error("Failed to get QBO auth URL", { error });
    res.status(500).json({
      success: false,
      error: "Failed to get authorization URL",
    });
  }
});

/**
 * GET /qbo/auth/callback - Handle OAuth callback
 */
router.get("/auth/callback", async (req: Request, res: Response) => {
  try {
    const { code, state, realmId } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "Authorization code is required",
      });
    }

    logger.info("QBO OAuth callback received", { code, state, realmId });

    // Exchange code for token
    const token = await qboService.exchangeCodeForToken(code as string);

    res.json({
      success: true,
      message: "QBO authorization successful",
      data: {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: token.expires_at,
        realmId,
      },
    });
  } catch (error) {
    logger.error("Failed to handle QBO callback", { error });
    res.status(500).json({
      success: false,
      error: "Failed to complete authorization",
    });
  }
});

/**
 * GET /qbo/connection/test - Test QBO connection
 */
router.get("/connection/test", async (req: Request, res: Response) => {
  try {
    const isConnected = await qboService.testConnection();

    res.json({
      success: true,
      data: {
        connected: isConnected,
        message: isConnected
          ? "QBO connection successful"
          : "QBO connection failed",
      },
    });
  } catch (error) {
    logger.error("Failed to test QBO connection", { error });
    res.status(500).json({
      success: false,
      error: "Failed to test connection",
    });
  }
});

/**
 * GET /qbo/company - Get company information
 */
router.get("/company", async (req: Request, res: Response) => {
  try {
    const companyInfo = await qboService.getCompanyInfo();

    res.json({
      success: true,
      data: companyInfo,
    });
  } catch (error) {
    logger.error("Failed to get company info", { error });
    res.status(500).json({
      success: false,
      error: "Failed to get company information",
    });
  }
});

/**
 * GET /qbo/customers - Search QBO customers
 */
router.get("/customers", async (req: Request, res: Response) => {
  try {
    const { query = "" } = req.query;

    const customers = await qboService.searchCustomers(query as string);

    res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    logger.error("Failed to search customers", { error });
    res.status(500).json({
      success: false,
      error: "Failed to search customers",
    });
  }
});

/**
 * GET /qbo/customers/:id - Get specific customer
 */
router.get("/customers/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const customer = await qboService.getCustomer(id);

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    logger.error("Failed to get customer", { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: "Failed to get customer",
    });
  }
});

export { router as qboRoutes };
