import { Router, Request, Response } from "express";
import { body, query, validationResult } from "express-validator";
import { QBOService } from "../services/QBOService";
import { logger } from "../utils/logger";
import crypto from "crypto";
import { config } from "../config";

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
    const tokens = await qboService.handleCallback(
      callbackUrl,
      state as string,
      realmId as string
    );

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
        expiresIn: tokens.expires_in,
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
 * GET /qbo/token-status - Get current token status
 */
router.get("/token-status", async (req: Request, res: Response) => {
  try {
    const tokenStatus = qboService.getTokenStatus();

    res.json({
      success: true,
      data: tokenStatus,
    });
  } catch (error) {
    logger.error("Failed to get QBO token status", { error });
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get token status",
    });
  }
});

/**
 * POST /qbo/ensure-tokens - Ensure tokens are valid (refresh if needed)
 */
router.post("/ensure-tokens", async (req: Request, res: Response) => {
  try {
    const isValid = await qboService.ensureValidTokens();

    if (isValid) {
      const tokenStatus = qboService.getTokenStatus();
      res.json({
        success: true,
        data: {
          message: "Tokens are valid",
          ...tokenStatus,
        },
      });
    } else {
      res.status(401).json({
        success: false,
        error: "Failed to ensure valid tokens. Re-authentication required.",
      });
    }
  } catch (error) {
    logger.error("Failed to ensure QBO tokens", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to ensure tokens",
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
 * GET /qbo/customers/search/display-name - Search for customer by exact display name
 */
router.get(
  "/customers/search/display-name",
  [
    query("displayName")
      .isString()
      .notEmpty()
      .withMessage("Display name is required"),
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

      const { displayName } = req.query;
      const customer = await qboService.searchCustomerByDisplayName(
        displayName as string
      );

      res.json({
        success: true,
        data: customer,
        found: !!customer,
      });
    } catch (error) {
      logger.error("Failed to search QBO customer by display name", { error });
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to search customer by display name",
      });
    }
  }
);

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
 * GET /qbo/status - Get comprehensive QBO connection status
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const isAuthenticated = qboService.isAuthenticated();
    const tokens = qboService.getTokens();
    const tokenStatus = qboService.getTokenStatus();

    // Test connection if authenticated
    let connectionTest: boolean | null = null;
    let companyInfo: any = null;

    if (isAuthenticated) {
      try {
        connectionTest = await qboService.testConnection();
        if (connectionTest) {
          try {
            companyInfo = await qboService.getCompanyInfo();
          } catch (error) {
            logger.warn("Failed to get company info for QBO status", { error });
          }
        }
      } catch (error) {
        logger.warn("Failed to test QBO connection", { error });
        connectionTest = false;
      }
    }

    res.json({
      success: true,
      data: {
        authenticated: isAuthenticated,
        connected: connectionTest,
        hasTokens: !!tokens,
        tokenStatus,
        companyInfo: companyInfo
          ? {
              companyName: companyInfo.CompanyName,
              legalName: companyInfo.LegalName,
              environment: companyInfo.domain,
              timezone: companyInfo.DefaultTimeZone,
            }
          : null,
        environment: process.env.QBO_ENVIRONMENT || "not configured",
        clientId: process.env.QBO_CLIENT_ID ? "configured" : "not configured",
        redirectUri: process.env.QBO_REDIRECT_URI || "not configured",
        overall: {
          healthy: isAuthenticated && connectionTest,
          issues: [
            !isAuthenticated && "Not authenticated",
            isAuthenticated && !connectionTest && "Connection failed",
          ].filter(Boolean),
        },
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

/**
 * POST /qbo/webhook - Intuit Webhooks endpoint
 * Intuit sends 'intuit-signature' header = base64(HMAC-SHA256(webhookVerifier, rawBody))
 */
router.post("/webhook", (req: Request, res: Response) => {
  try {
    const signature = req.get("intuit-signature");
    if (!signature) {
      return res.status(401).send("FORBIDDEN");
    }

    if (!config.qbo.webhookVerifier) {
      logger.warn("QBO webhook verifier secret is not configured");
      return res.status(500).send("Webhook not configured");
    }

    // Raw body is attached by middleware in server.ts
    const rawBody = (req as any).rawBody as Buffer | string | undefined;
    if (!rawBody) {
      logger.warn("Missing rawBody on webhook request");
      return res.status(400).send("Bad Request");
    }

    const computed = crypto
      .createHmac("sha256", config.qbo.webhookVerifier)
      .update(typeof rawBody === "string" ? rawBody : Buffer.from(rawBody))
      .digest("base64");

    if (computed !== signature) {
      logger.warn("QBO webhook signature mismatch");
      return res.status(401).send("FORBIDDEN");
    }

    logger.info("Valid QBO webhook received");
    // Optionally, queue processing; for now just log and 200
    logger.info(JSON.stringify(req.body));
    return res.status(200).send("SUCCESS");
  } catch (error) {
    logger.error("Error handling QBO webhook", { error });
    return res.status(500).send("Internal Server Error");
  }
});

export { router as qboRoutes };
