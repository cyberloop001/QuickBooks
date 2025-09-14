import { Router, Request, Response } from "express";
import { body, param, validationResult } from "express-validator";
import { RegionService, CreateRegionData, UpdateRegionData } from "../services/RegionService";
import { logger } from "../utils/logger";

const router = Router();
const regionService = new RegionService();

/**
 * GET /regions - Get all regions
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const regions = await regionService.getAllRegions();
    
    res.json({
      success: true,
      data: regions
    });
  } catch (error) {
    logger.error("Failed to get regions", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get regions"
    });
  }
});

/**
 * GET /regions/active - Get active regions only
 */
router.get("/active", async (req: Request, res: Response) => {
  try {
    const regions = await regionService.getActiveRegions();
    
    res.json({
      success: true,
      data: regions
    });
  } catch (error) {
    logger.error("Failed to get active regions", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get active regions"
    });
  }
});

/**
 * GET /regions/stats - Get region statistics
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await regionService.getRegionStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error("Failed to get region stats", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get region stats"
    });
  }
});

/**
 * GET /regions/:id - Get region by ID
 */
router.get(
  "/:id",
  [param("id").isUUID().withMessage("Invalid region ID")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const region = await regionService.getRegionById(req.params.id);
      
      if (!region) {
        return res.status(404).json({
          success: false,
          error: "Region not found"
        });
      }

      res.json({
        success: true,
        data: region
      });
    } catch (error) {
      logger.error("Failed to get region by ID", { error, id: req.params.id });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get region"
      });
    }
  }
);

/**
 * POST /regions - Create new region
 */
router.post(
  "/",
  [
    body("name").notEmpty().withMessage("Region name is required"),
    body("description").optional().isString(),
    body("isActive").optional().isBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const regionData: CreateRegionData = req.body;
      const region = await regionService.createRegion(regionData);
      
      res.status(201).json({
        success: true,
        data: region
      });
    } catch (error) {
      logger.error("Failed to create region", { error, body: req.body });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create region"
      });
    }
  }
);

/**
 * PUT /regions/:id - Update region
 */
router.put(
  "/:id",
  [
    param("id").isUUID().withMessage("Invalid region ID"),
    body("name").optional().notEmpty().withMessage("Region name cannot be empty"),
    body("description").optional().isString(),
    body("isActive").optional().isBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const updateData: UpdateRegionData = req.body;
      const region = await regionService.updateRegion(req.params.id, updateData);
      
      res.json({
        success: true,
        data: region
      });
    } catch (error) {
      logger.error("Failed to update region", { error, id: req.params.id, body: req.body });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update region"
      });
    }
  }
);

/**
 * DELETE /regions/:id - Delete region
 */
router.delete(
  "/:id",
  [param("id").isUUID().withMessage("Invalid region ID")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      await regionService.deleteRegion(req.params.id);
      
      res.json({
        success: true,
        message: "Region deleted successfully"
      });
    } catch (error) {
      logger.error("Failed to delete region", { error, id: req.params.id });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete region"
      });
    }
  }
);

export { router as regionsRouter };
