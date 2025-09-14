import { Router, Request, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { TeamService, CreateTeamData, UpdateTeamData } from "../services/TeamService";
import { logger } from "../utils/logger";

const router = Router();
const teamService = new TeamService();

/**
 * GET /teams - Get all teams
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const teams = await teamService.getAllTeams();
    
    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    logger.error("Failed to get teams", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get teams"
    });
  }
});

/**
 * GET /teams/active - Get active teams only
 */
router.get("/active", async (req: Request, res: Response) => {
  try {
    const teams = await teamService.getActiveTeams();
    
    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    logger.error("Failed to get active teams", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get active teams"
    });
  }
});

/**
 * GET /teams/by-region/:regionId - Get teams by region
 */
router.get(
  "/by-region/:regionId",
  [param("regionId").isUUID().withMessage("Invalid region ID")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const teams = await teamService.getTeamsByRegion(req.params.regionId);
      
      res.json({
        success: true,
        data: teams
      });
    } catch (error) {
      logger.error("Failed to get teams by region", { error, regionId: req.params.regionId });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get teams by region"
      });
    }
  }
);

/**
 * GET /teams/stats - Get team statistics
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await teamService.getTeamStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error("Failed to get team stats", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get team stats"
    });
  }
});

/**
 * GET /teams/:id - Get team by ID
 */
router.get(
  "/:id",
  [param("id").isUUID().withMessage("Invalid team ID")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const team = await teamService.getTeamById(req.params.id);
      
      if (!team) {
        return res.status(404).json({
          success: false,
          error: "Team not found"
        });
      }

      res.json({
        success: true,
        data: team
      });
    } catch (error) {
      logger.error("Failed to get team by ID", { error, id: req.params.id });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get team"
      });
    }
  }
);

/**
 * POST /teams - Create new team
 */
router.post(
  "/",
  [
    body("name").notEmpty().withMessage("Team name is required"),
    body("description").optional().isString(),
    body("regionId").isUUID().withMessage("Valid region ID is required"),
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

      const teamData: CreateTeamData = req.body;
      const team = await teamService.createTeam(teamData);
      
      res.status(201).json({
        success: true,
        data: team
      });
    } catch (error) {
      logger.error("Failed to create team", { error, body: req.body });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create team"
      });
    }
  }
);

/**
 * PUT /teams/:id - Update team
 */
router.put(
  "/:id",
  [
    param("id").isUUID().withMessage("Invalid team ID"),
    body("name").optional().notEmpty().withMessage("Team name cannot be empty"),
    body("description").optional().isString(),
    body("regionId").optional().isUUID().withMessage("Invalid region ID"),
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

      const updateData: UpdateTeamData = req.body;
      const team = await teamService.updateTeam(req.params.id, updateData);
      
      res.json({
        success: true,
        data: team
      });
    } catch (error) {
      logger.error("Failed to update team", { error, id: req.params.id, body: req.body });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update team"
      });
    }
  }
);

/**
 * DELETE /teams/:id - Delete team
 */
router.delete(
  "/:id",
  [param("id").isUUID().withMessage("Invalid team ID")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      await teamService.deleteTeam(req.params.id);
      
      res.json({
        success: true,
        message: "Team deleted successfully"
      });
    } catch (error) {
      logger.error("Failed to delete team", { error, id: req.params.id });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete team"
      });
    }
  }
);

export { router as teamsRouter };
