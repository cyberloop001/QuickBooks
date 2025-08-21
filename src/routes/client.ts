import { Router, Request, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import {
  ClientService,
  CreateClientData,
  UpdateClientData,
} from "../services/ClientService";
import { logger } from "../utils/logger";

const router = Router();

// Lazy initialization of ClientService to avoid database connection issues
let clientService: ClientService | null = null;

const getClientService = (): ClientService => {
  if (!clientService) {
    clientService = new ClientService();
  }
  return clientService;
};

/**
 * GET /clients - Get all clients with pagination and filtering
 */
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("search").optional().isString().trim(),
    query("isActive").optional().isBoolean().toBoolean(),
    query("hasQboCustomerId").optional().isBoolean().toBoolean(),
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

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        search: req.query.search as string,
        isActive: req.query.isActive as boolean | undefined,
        hasQboCustomerId: req.query.hasQboCustomerId as boolean | undefined,
      };

      const result = await getClientService().getClients(page, limit, filters);

      res.json({
        success: true,
        data: result.clients,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error("Failed to get clients", { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get clients",
      });
    }
  }
);

/**
 * GET /clients/:id - Get specific client
 */
router.get(
  "/:id",
  [param("id").isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const client = await getClientService().getClientById(id);

      res.json({
        success: true,
        data: client,
      });
    } catch (error) {
      logger.error("Failed to get client", { error, id: req.params.id });

      if (error instanceof Error && error.message === "Client not found") {
        return res.status(404).json({
          success: false,
          error: "Client not found",
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get client",
      });
    }
  }
);

/**
 * GET /clients/:id/stats - Get client statistics
 */
router.get(
  "/:id/stats",
  [param("id").isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const stats = await getClientService().getClientStats(id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Failed to get client stats", { error, id: req.params.id });

      if (error instanceof Error && error.message === "Client not found") {
        return res.status(404).json({
          success: false,
          error: "Client not found",
        });
      }

      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get client statistics",
      });
    }
  }
);

/**
 * POST /clients - Create new client
 */
router.post(
  "/",
  [
    body("name")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Company name is required"),
    body("genesysClientId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Genesys Client ID is required"),
    body("qboCustomerId").optional().isString().trim(),
    body("email").optional().isEmail().withMessage("Invalid email format"),
    body("phone").optional().isString().trim(),
    body("address").optional().isString().trim(),
    body("city").optional().isString().trim(),
    body("state").optional().isString().trim(),
    body("zipCode").optional().isString().trim(),
    body("country").optional().isString().trim(),
    body("ratePerMinute")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Rate must be a positive number"),
    body("taxCode").optional().isString().trim(),
    body("notes").optional().isString().trim(),
    body("isActive").optional().isBoolean(),
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

      const clientData: CreateClientData = req.body;
      const client = await getClientService().createClient(clientData);

      res.status(201).json({
        success: true,
        message: "Client created successfully",
        data: client,
      });
    } catch (error) {
      logger.error("Failed to create client", { error, clientData: req.body });

      if (error instanceof Error && error.message.includes("already exists")) {
        return res.status(409).json({
          success: false,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create client",
      });
    }
  }
);

/**
 * PUT /clients/:id - Update client
 */
router.put(
  "/:id",
  [
    param("id").isUUID(),
    body("name")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Company name cannot be empty"),
    body("qboCustomerId").optional().isString().trim(),
    body("email").optional().isEmail().withMessage("Invalid email format"),
    body("phone").optional().isString().trim(),
    body("address").optional().isString().trim(),
    body("city").optional().isString().trim(),
    body("state").optional().isString().trim(),
    body("zipCode").optional().isString().trim(),
    body("country").optional().isString().trim(),
    body("ratePerMinute")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Rate must be a positive number"),
    body("taxCode").optional().isString().trim(),
    body("notes").optional().isString().trim(),
    body("isActive").optional().isBoolean(),
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

      const { id } = req.params;
      const updateData: UpdateClientData = req.body;
      const client = await getClientService().updateClient(id, updateData);

      res.json({
        success: true,
        message: "Client updated successfully",
        data: client,
      });
    } catch (error) {
      logger.error("Failed to update client", {
        error,
        id: req.params.id,
        updateData: req.body,
      });

      if (error instanceof Error && error.message === "Client not found") {
        return res.status(404).json({
          success: false,
          error: "Client not found",
        });
      }

      if (error instanceof Error && error.message.includes("already exists")) {
        return res.status(409).json({
          success: false,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update client",
      });
    }
  }
);

/**
 * DELETE /clients/:id - Delete client
 */
router.delete(
  "/:id",
  [param("id").isUUID()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      await getClientService().deleteClient(id);

      res.json({
        success: true,
        message: "Client deleted successfully",
        data: { id },
      });
    } catch (error) {
      logger.error("Failed to delete client", { error, id: req.params.id });

      if (error instanceof Error && error.message === "Client not found") {
        return res.status(404).json({
          success: false,
          error: "Client not found",
        });
      }

      if (
        error instanceof Error &&
        error.message.includes("existing phone usage records")
      ) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete client",
      });
    }
  }
);

/**
 * POST /clients/bulk-status - Bulk update client status
 */
router.post(
  "/bulk-status",
  [
    body("clientIds")
      .isArray({ min: 1 })
      .withMessage("At least one client ID is required"),
    body("clientIds.*").isUUID().withMessage("Invalid client ID format"),
    body("isActive").isBoolean().withMessage("isActive must be a boolean"),
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

      const { clientIds, isActive } = req.body;
      await getClientService().bulkUpdateStatus(clientIds, isActive);

      res.json({
        success: true,
        message: "Client statuses updated successfully",
        data: { updatedCount: clientIds.length },
      });
    } catch (error) {
      logger.error("Failed to bulk update client status", {
        error,
        clientIds: req.body.clientIds,
      });
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update client statuses",
      });
    }
  }
);

/**
 * GET /clients/search/quick - Quick search clients
 */
router.get(
  "/search/quick",
  [
    query("q")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Search query is required"),
    query("limit").optional().isInt({ min: 1, max: 50 }).toInt(),
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

      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 10;
      const clients = await getClientService().searchClients(query, limit);

      res.json({
        success: true,
        data: clients,
      });
    } catch (error) {
      logger.error("Failed to search clients", { error, query: req.query.q });
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to search clients",
      });
    }
  }
);

/**
 * GET /clients/active - Get all active clients
 */
router.get("/active", async (req: Request, res: Response) => {
  try {
    const clients = await getClientService().getActiveClients();

    res.json({
      success: true,
      data: clients,
    });
  } catch (error) {
    logger.error("Failed to get active clients", { error });
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get active clients",
    });
  }
});

export { router as clientRoutes };
