import { Router, Request, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import {
  CustomerProfileService,
  CreateCustomerProfileData,
  UpdateCustomerProfileData,
} from "../services/CustomerProfileService";
import { logger } from "../utils/logger";

const router = Router();

// Lazy initialization of CustomerProfileService to avoid database connection issues
let customerProfileService: CustomerProfileService | null = null;

const getCustomerProfileService = (): CustomerProfileService => {
  if (!customerProfileService) {
    customerProfileService = new CustomerProfileService();
  }
  return customerProfileService;
};

/**
 * GET /customer-profiles - Get all customer profiles with pagination and filtering
 */
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("search").optional().isString().trim(),
    query("isActive").optional().isBoolean().toBoolean(),
    query("hasQboCustomerId").optional().isBoolean().toBoolean(),
    query("hasGenesysQueues").optional().isBoolean().toBoolean(),
    query("queueName").optional().isString().trim(),
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
        hasGenesysQueues: req.query.hasGenesysQueues as boolean | undefined,
        queueName: req.query.queueName as string,
      };

      const result = await getCustomerProfileService().getCustomerProfiles(
        page,
        limit,
        filters
      );

      res.json({
        success: true,
        data: result.customerProfiles,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error("Failed to get customer profiles", { error });
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get customer profiles",
      });
    }
  }
);

/**
 * GET /customer-profiles/:id - Get specific customer profile
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
      const profile = await getCustomerProfileService().getCustomerProfileById(
        id
      );

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      logger.error("Failed to get customer profile", {
        error,
        id: req.params.id,
      });

      if (
        error instanceof Error &&
        error.message === "Customer profile not found"
      ) {
        return res.status(404).json({
          success: false,
          error: "Customer profile not found",
        });
      }

      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get customer profile",
      });
    }
  }
);

/**
 * GET /customer-profiles/:id/stats - Get customer profile statistics
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
      const stats = await getCustomerProfileService().getCustomerProfileStats(
        id
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Failed to get customer profile stats", {
        error,
        id: req.params.id,
      });

      if (
        error instanceof Error &&
        error.message === "Customer profile not found"
      ) {
        return res.status(404).json({
          success: false,
          error: "Customer profile not found",
        });
      }

      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get customer profile statistics",
      });
    }
  }
);

/**
 * POST /customer-profiles - Create new customer profile
 */
router.post(
  "/",
  [
    body("name")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Customer name is required"),
    body("genesysQueueNames")
      .isArray({ min: 1 })
      .withMessage("At least one Genesys queue name is required"),
    body("genesysQueueNames.*")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Queue names cannot be empty"),
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
    body("qboCompanyName").optional().isString().trim(),
    body("qboDisplayName").optional().isString().trim(),
    body("qboPrimaryEmailAddr").optional().isString().trim(),
    body("qboPrimaryPhone").optional().isString().trim(),
    body("qboBillAddr").optional().isString().trim(),
    body("qboShipAddr").optional().isString().trim(),
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

      const profileData: CreateCustomerProfileData = req.body;
      const profile = await getCustomerProfileService().createCustomerProfile(
        profileData
      );

      res.status(201).json({
        success: true,
        message: "Customer profile created successfully",
        data: profile,
      });
    } catch (error) {
      logger.error("Failed to create customer profile", {
        error,
        profileData: req.body,
      });

      if (error instanceof Error && error.message.includes("already exists")) {
        return res.status(409).json({
          success: false,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create customer profile",
      });
    }
  }
);

/**
 * PUT /customer-profiles/:id - Update customer profile
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
      .withMessage("Customer name cannot be empty"),
    body("genesysQueueNames")
      .optional()
      .isArray({ min: 1 })
      .withMessage("At least one Genesys queue name is required"),
    body("genesysQueueNames.*")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Queue names cannot be empty"),
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
    body("qboCompanyName").optional().isString().trim(),
    body("qboDisplayName").optional().isString().trim(),
    body("qboPrimaryEmailAddr").optional().isString().trim(),
    body("qboPrimaryPhone").optional().isString().trim(),
    body("qboBillAddr").optional().isString().trim(),
    body("qboShipAddr").optional().isString().trim(),
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
      const updateData: UpdateCustomerProfileData = req.body;
      const profile = await getCustomerProfileService().updateCustomerProfile(
        id,
        updateData
      );

      res.json({
        success: true,
        message: "Customer profile updated successfully",
        data: profile,
      });
    } catch (error) {
      logger.error("Failed to update customer profile", {
        error,
        id: req.params.id,
        updateData: req.body,
      });

      if (
        error instanceof Error &&
        error.message === "Customer profile not found"
      ) {
        return res.status(404).json({
          success: false,
          error: "Customer profile not found",
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
          error instanceof Error
            ? error.message
            : "Failed to update customer profile",
      });
    }
  }
);

/**
 * DELETE /customer-profiles/:id - Delete customer profile
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
      await getCustomerProfileService().deleteCustomerProfile(id);

      res.json({
        success: true,
        message: "Customer profile deleted successfully",
        data: { id },
      });
    } catch (error) {
      logger.error("Failed to delete customer profile", {
        error,
        id: req.params.id,
      });

      if (
        error instanceof Error &&
        error.message === "Customer profile not found"
      ) {
        return res.status(404).json({
          success: false,
          error: "Customer profile not found",
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
          error instanceof Error
            ? error.message
            : "Failed to delete customer profile",
      });
    }
  }
);

/**
 * POST /customer-profiles/bulk-status - Bulk update customer profile status
 */
router.post(
  "/bulk-status",
  [
    body("profileIds")
      .isArray({ min: 1 })
      .withMessage("At least one profile ID is required"),
    body("profileIds.*").isUUID().withMessage("Invalid profile ID format"),
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

      const { profileIds, isActive } = req.body;
      await getCustomerProfileService().bulkUpdateStatus(profileIds, isActive);

      res.json({
        success: true,
        message: "Customer profile statuses updated successfully",
        data: { updatedCount: profileIds.length },
      });
    } catch (error) {
      logger.error("Failed to bulk update customer profile status", {
        error,
        profileIds: req.body.profileIds,
      });
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update customer profile statuses",
      });
    }
  }
);

/**
 * GET /customer-profiles/search/quick - Quick search customer profiles
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
      const profiles = await getCustomerProfileService().searchCustomerProfiles(
        query,
        limit
      );

      res.json({
        success: true,
        data: profiles,
      });
    } catch (error) {
      logger.error("Failed to search customer profiles", {
        error,
        query: req.query.q,
      });
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to search customer profiles",
      });
    }
  }
);

/**
 * GET /customer-profiles/active - Get all active customer profiles
 */
router.get("/active", async (req: Request, res: Response) => {
  try {
    const profiles =
      await getCustomerProfileService().getActiveCustomerProfiles();

    res.json({
      success: true,
      data: profiles,
    });
  } catch (error) {
    logger.error("Failed to get active customer profiles", { error });
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get active customer profiles",
    });
  }
});

/**
 * GET /customer-profiles/queues/all - Get all queue names across all profiles
 */
router.get("/queues/all", async (req: Request, res: Response) => {
  try {
    const queueNames = await getCustomerProfileService().getAllQueueNames();

    res.json({
      success: true,
      data: queueNames,
    });
  } catch (error) {
    logger.error("Failed to get all queue names", { error });
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get all queue names",
    });
  }
});

/**
 * POST /customer-profiles/:id/sync-qbo - Sync QBO customer data to profile
 */
router.post(
  "/:id/sync-qbo",
  [
    param("id").isUUID(),
    body("qboData").isObject().withMessage("QBO data is required"),
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
      const { qboData } = req.body;
      const profile = await getCustomerProfileService().syncQBOData(
        id,
        qboData
      );

      res.json({
        success: true,
        message: "QBO data synced successfully",
        data: profile,
      });
    } catch (error) {
      logger.error("Failed to sync QBO data", { error, id: req.params.id });

      if (
        error instanceof Error &&
        error.message === "Customer profile not found"
      ) {
        return res.status(404).json({
          success: false,
          error: "Customer profile not found",
        });
      }

      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to sync QBO data",
      });
    }
  }
);

export { router as customerProfileRoutes };
