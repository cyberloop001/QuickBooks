import { Router, Request, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { QueueAssignmentService, CreateQueueAssignmentData, UpdateQueueAssignmentData } from "../services/QueueAssignmentService";
import { GenesysService } from "../services/GenesysService";
import { logger } from "../utils/logger";

const router = Router();
const queueAssignmentService = new QueueAssignmentService();
const genesysService = new GenesysService();

/**
 * GET /queue-assignments - Get all queue assignments
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const assignments = await queueAssignmentService.getAllQueueAssignments();
    
    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    logger.error("Failed to get queue assignments", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get queue assignments"
    });
  }
});

/**
 * GET /queue-assignments/unassigned - Get unassigned queues
 */
router.get("/unassigned", async (req: Request, res: Response) => {
  try {
    // Get all queues from Genesys
    const genesysQueues = await genesysService.getQueues(1, 1000); // Get all queues
    
    // Get unassigned queues
    const unassignedQueues = await queueAssignmentService.getUnassignedQueues(
      genesysQueues.queues.map(q => ({ id: q.id, name: q.name }))
    );
    
    res.json({
      success: true,
      data: unassignedQueues
    });
  } catch (error) {
    logger.error("Failed to get unassigned queues", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get unassigned queues"
    });
  }
});

/**
 * GET /queue-assignments/by-team/:teamId - Get queue assignments by team
 */
router.get(
  "/by-team/:teamId",
  [param("teamId").isUUID().withMessage("Invalid team ID")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const assignments = await queueAssignmentService.getQueueAssignmentsByTeam(req.params.teamId);
      
      res.json({
        success: true,
        data: assignments
      });
    } catch (error) {
      logger.error("Failed to get queue assignments by team", { error, teamId: req.params.teamId });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get queue assignments by team"
      });
    }
  }
);

/**
 * GET /queue-assignments/stats - Get queue assignment statistics
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await queueAssignmentService.getQueueAssignmentStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error("Failed to get queue assignment stats", { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get queue assignment stats"
    });
  }
});

/**
 * GET /queue-assignments/:id - Get queue assignment by ID
 */
router.get(
  "/:id",
  [param("id").isUUID().withMessage("Invalid assignment ID")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const assignment = await queueAssignmentService.getQueueAssignmentByQueueId(req.params.id);
      
      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: "Queue assignment not found"
        });
      }

      res.json({
        success: true,
        data: assignment
      });
    } catch (error) {
      logger.error("Failed to get queue assignment by ID", { error, id: req.params.id });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get queue assignment"
      });
    }
  }
);

/**
 * POST /queue-assignments - Create new queue assignment
 */
router.post(
  "/",
  [
    body("queueId").notEmpty().withMessage("Queue ID is required"),
    body("queueName").notEmpty().withMessage("Queue name is required"),
    body("teamId").isUUID().withMessage("Valid team ID is required"),
    body("assignedBy").optional().isString(),
    body("notes").optional().isString()
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

      const assignmentData: CreateQueueAssignmentData = req.body;
      const assignment = await queueAssignmentService.createQueueAssignment(assignmentData);
      
      res.status(201).json({
        success: true,
        data: assignment
      });
    } catch (error) {
      logger.error("Failed to create queue assignment", { error, body: req.body });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create queue assignment"
      });
    }
  }
);

/**
 * PUT /queue-assignments/:id - Update queue assignment
 */
router.put(
  "/:id",
  [
    param("id").isUUID().withMessage("Invalid assignment ID"),
    body("teamId").optional().isUUID().withMessage("Invalid team ID"),
    body("assignedBy").optional().isString(),
    body("notes").optional().isString()
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

      const updateData: UpdateQueueAssignmentData = req.body;
      const assignment = await queueAssignmentService.updateQueueAssignment(req.params.id, updateData);
      
      res.json({
        success: true,
        data: assignment
      });
    } catch (error) {
      logger.error("Failed to update queue assignment", { error, id: req.params.id, body: req.body });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update queue assignment"
      });
    }
  }
);

/**
 * DELETE /queue-assignments/:id - Delete queue assignment
 */
router.delete(
  "/:id",
  [param("id").isUUID().withMessage("Invalid assignment ID")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      await queueAssignmentService.deleteQueueAssignment(req.params.id);
      
      res.json({
        success: true,
        message: "Queue assignment deleted successfully"
      });
    } catch (error) {
      logger.error("Failed to delete queue assignment", { error, id: req.params.id });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete queue assignment"
      });
    }
  }
);

export { router as queueAssignmentsRouter };
