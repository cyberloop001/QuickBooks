import { getRepository, Repository } from "typeorm";
import { QueueAssignment } from "../entities/QueueAssignment";
import { Team } from "../entities/Team";
import { logger } from "../utils/logger";

export interface CreateQueueAssignmentData {
  queueId: string;
  queueName: string;
  teamId: string;
  assignedBy?: string;
  notes?: string;
}

export interface UpdateQueueAssignmentData {
  teamId?: string;
  assignedBy?: string;
  notes?: string;
}

export class QueueAssignmentService {
  private get queueAssignmentRepository(): Repository<QueueAssignment> {
    return getRepository(QueueAssignment);
  }

  private get teamRepository(): Repository<Team> {
    return getRepository(Team);
  }

  /**
   * Get all queue assignments
   */
  async getAllQueueAssignments(): Promise<QueueAssignment[]> {
    try {
      return await this.queueAssignmentRepository.find({
        relations: ["team", "team.region"],
        order: { assignedAt: "DESC" },
      });
    } catch (error) {
      logger.error("Failed to get all queue assignments", { error });
      throw error;
    }
  }

  /**
   * Get queue assignments by team
   */
  async getQueueAssignmentsByTeam(teamId: string): Promise<QueueAssignment[]> {
    try {
      return await this.queueAssignmentRepository.find({
        where: { teamId },
        relations: ["team", "team.region"],
        order: { assignedAt: "DESC" },
      });
    } catch (error) {
      logger.error("Failed to get queue assignments by team", {
        error,
        teamId,
      });
      throw error;
    }
  }

  /**
   * Get queue assignment by queue ID
   */
  async getQueueAssignmentByQueueId(
    queueId: string
  ): Promise<QueueAssignment | null> {
    try {
      return await this.queueAssignmentRepository.findOne({
        where: { queueId },
        relations: ["team", "team.region"],
      });
    } catch (error) {
      logger.error("Failed to get queue assignment by queue ID", {
        error,
        queueId,
      });
      throw error;
    }
  }

  /**
   * Get unassigned queues (queues from Genesys that are not in queue_assignments)
   */
  async getUnassignedQueues(
    genesysQueues: Array<{ id: string; name: string }>
  ): Promise<Array<{ id: string; name: string }>> {
    try {
      const assignedQueueIds = await this.queueAssignmentRepository
        .createQueryBuilder("qa")
        .select("qa.queueId")
        .getRawMany();

      const assignedIds = assignedQueueIds.map((q) => q.qa_queueId);

      return genesysQueues.filter((queue) => !assignedIds.includes(queue.id));
    } catch (error) {
      logger.error("Failed to get unassigned queues", { error });
      throw error;
    }
  }

  /**
   * Create new queue assignment
   */
  async createQueueAssignment(
    assignmentData: CreateQueueAssignmentData
  ): Promise<QueueAssignment> {
    try {
      logger.info("Creating new queue assignment", { assignmentData });

      // Verify team exists
      const team = await this.teamRepository.findOne({
        where: { id: assignmentData.teamId },
      });

      if (!team) {
        throw new Error("Team not found");
      }

      // Check if queue is already assigned
      const existingAssignment = await this.queueAssignmentRepository.findOne({
        where: { queueId: assignmentData.queueId },
      });

      if (existingAssignment) {
        throw new Error("Queue is already assigned to a team");
      }

      const assignment = this.queueAssignmentRepository.create({
        ...assignmentData,
        assignedAt: new Date(),
      });

      const savedAssignment = await this.queueAssignmentRepository.save(
        assignment
      );

      logger.info("Created new queue assignment", {
        id: savedAssignment.id,
        queueId: savedAssignment.queueId,
        queueName: savedAssignment.queueName,
        teamId: savedAssignment.teamId,
      });

      return savedAssignment;
    } catch (error) {
      logger.error("Failed to create queue assignment", {
        error,
        assignmentData,
      });
      throw error;
    }
  }

  /**
   * Update queue assignment
   */
  async updateQueueAssignment(
    id: string,
    updateData: UpdateQueueAssignmentData
  ): Promise<QueueAssignment> {
    try {
      logger.info("Updating queue assignment", { id, updateData });

      const assignment = await this.queueAssignmentRepository.findOne({
        where: { id },
        relations: ["team", "team.region"],
      });

      if (!assignment) {
        throw new Error("Queue assignment not found");
      }

      // If changing team, verify new team exists
      if (updateData.teamId && updateData.teamId !== assignment.teamId) {
        const team = await this.teamRepository.findOne({
          where: { id: updateData.teamId },
        });

        if (!team) {
          throw new Error("Team not found");
        }
      }

      // Use update method instead of Object.assign + save
      await this.queueAssignmentRepository.update(id, updateData);

      // Fetch the updated assignment with relations
      const updatedAssignment = await this.queueAssignmentRepository.findOne({
        where: { id },
        relations: ["team", "team.region"],
      });

      if (!updatedAssignment) {
        throw new Error("Failed to retrieve updated assignment");
      }

      logger.info("Updated queue assignment", {
        id: updatedAssignment.id,
        queueId: updatedAssignment.queueId,
        teamId: updatedAssignment.teamId,
      });

      return updatedAssignment;
    } catch (error) {
      logger.error("Failed to update queue assignment", {
        error,
        id,
        updateData,
      });
      throw error;
    }
  }

  /**
   * Delete queue assignment
   */
  async deleteQueueAssignment(id: string): Promise<void> {
    try {
      logger.info("Deleting queue assignment", { id });

      const assignment = await this.queueAssignmentRepository.findOne({
        where: { id },
      });

      if (!assignment) {
        throw new Error("Queue assignment not found");
      }

      await this.queueAssignmentRepository.remove(assignment);

      logger.info("Deleted queue assignment", {
        id,
        queueId: assignment.queueId,
        queueName: assignment.queueName,
      });
    } catch (error) {
      logger.error("Failed to delete queue assignment", { error, id });
      throw error;
    }
  }

  /**
   * Get queue assignment statistics
   */
  async getQueueAssignmentStats(): Promise<{
    totalAssignments: number;
    assignmentsByTeam: Record<string, number>;
    assignmentsByRegion: Record<string, number>;
    recentAssignments: number; // assignments in last 7 days
  }> {
    try {
      const assignments = await this.queueAssignmentRepository.find({
        relations: ["team", "team.region"],
      });

      const totalAssignments = assignments.length;

      const assignmentsByTeam: Record<string, number> = {};
      const assignmentsByRegion: Record<string, number> = {};

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      let recentAssignments = 0;

      assignments.forEach((assignment) => {
        const teamName = assignment.team?.name || "Unknown";
        const regionName = assignment.team?.region?.name || "Unknown";

        assignmentsByTeam[teamName] = (assignmentsByTeam[teamName] || 0) + 1;
        assignmentsByRegion[regionName] =
          (assignmentsByRegion[regionName] || 0) + 1;

        if (assignment.assignedAt >= sevenDaysAgo) {
          recentAssignments++;
        }
      });

      return {
        totalAssignments,
        assignmentsByTeam,
        assignmentsByRegion,
        recentAssignments,
      };
    } catch (error) {
      logger.error("Failed to get queue assignment stats", { error });
      throw error;
    }
  }
}
