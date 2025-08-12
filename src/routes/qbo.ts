import { Router, Request, Response } from "express";
import { body, query, validationResult } from "express-validator";
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
        message: "Visit this URL to authorize QBO access",
      },
    });
  } catch (error) {
    logger.error("Failed to get QBO authorization URL", { error });
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get authorization URL",
    });
  }
});

/**
 * GET /qbo/callback - Handle OAuth callback
 */
router.get("/callback", async (req: Request, res: Response) => {
  try {
    const { code, state, realmId } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "Authorization code is required",
      });
    }

    // Construct the full callback URL
    const callbackUrl =
      req.protocol + "://" + req.get("host") + req.originalUrl;

    // Exchange code for tokens
    const tokens = await qboService.handleCallback(callbackUrl);

    // Store tokens (in production, store in database)
    // For now, we'll store in memory (not recommended for production)

    res.json({
      success: true,
      data: {
        message: "QBO authorization successful",
        realmId: tokens.realmId,
        expiresAt: tokens.expires_at,
      },
    });
  } catch (error) {
    logger.error("Failed to handle QBO callback", { error });
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to complete authorization",
    });
  }
});

/**
 * GET /qbo/refresh - Refresh access token
 */
router.get("/refresh", async (req: Request, res: Response) => {
  try {
    const tokens = await qboService.refreshAccessToken();

    res.json({
      success: true,
      data: {
        message: "Token refreshed successfully",
        expiresAt: tokens.expires_at,
      },
    });
  } catch (error) {
    logger.error("Failed to refresh QBO token", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to refresh token",
    });
  }
});

/**
 * GET /qbo/company-info - Get company information
 */
router.get("/company-info", async (req: Request, res: Response) => {
  try {
    if (!qboService.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated with QBO. Please complete OAuth flow first.",
      });
    }

    const companyInfo = await qboService.getCompanyInfo();

    res.json({
      success: true,
      data: companyInfo,
    });
  } catch (error) {
    logger.error("Failed to get QBO company info", { error });
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get company info",
    });
  }
});

/**
 * GET /qbo/customers/search - Search for customers
 */
router.get(
  "/customers/search",
  [
    query("query")
      .isString()
      .notEmpty()
      .withMessage("Search query is required"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      if (!qboService.isAuthenticated()) {
        return res.status(401).json({
          success: false,
          error:
            "Not authenticated with QBO. Please complete OAuth flow first.",
        });
      }

      const { query } = req.query;
      const customers = await qboService.searchCustomers(query as string);

      res.json({
        success: true,
        data: customers,
      });
    } catch (error) {
      logger.error("Failed to search QBO customers", { error });
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to search customers",
      });
    }
  }
);

/**
 * GET /qbo/customers/:id - Get customer by ID
 */
router.get("/customers/:id", async (req: Request, res: Response) => {
  try {
    if (!qboService.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated with QBO. Please complete OAuth flow first.",
      });
    }

    const { id } = req.params;
    const customer = await qboService.getCustomer(id);

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    logger.error("Failed to get QBO customer", {
      error,
      customerId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get customer",
    });
  }
});

/**
 * POST /qbo/test-connection - Test QBO connection
 */
router.post("/test-connection", async (req: Request, res: Response) => {
  try {
    const isConnected = await qboService.testConnection();

    if (isConnected) {
      res.json({
        success: true,
        data: {
          message: "QBO connection successful",
          authenticated: true,
        },
      });
    } else {
      res.status(401).json({
        success: false,
        error: "QBO connection failed. Please complete OAuth flow first.",
      });
    }
  } catch (error) {
    logger.error("QBO connection test failed", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Connection test failed",
    });
  }
});

/**
 * GET /qbo/status - Get QBO connection status
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const isAuthenticated = qboService.isAuthenticated();
    const tokens = qboService.getTokens();

    res.json({
      success: true,
      data: {
        authenticated: isAuthenticated,
        hasTokens: !!tokens,
        environment: process.env.QBO_ENVIRONMENT || "not configured",
        clientId: process.env.QBO_CLIENT_ID ? "configured" : "not configured",
        redirectUri: process.env.QBO_REDIRECT_URI || "not configured",
      },
    });
  } catch (error) {
    logger.error("Failed to get QBO status", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get status",
    });
  }
});

export { router as qboRoutes };
