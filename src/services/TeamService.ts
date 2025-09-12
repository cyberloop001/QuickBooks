import { getRepository, Repository } from "typeorm";
import { Team } from "../entities/Team";
import { Region } from "../entities/Region";
import { logger } from "../utils/logger";

export interface CreateTeamData {
  name: string;
  description?: string;
  regionId: string;
  isActive?: boolean;
}

export interface UpdateTeamData {
  name?: string;
  description?: string;
  regionId?: string;
  isActive?: boolean;
}

export class TeamService {
  private get teamRepository(): Repository<Team> {
    return getRepository(Team);
  }

  private get regionRepository(): Repository<Region> {
    return getRepository(Region);
  }

  /**
   * Get all teams
   */
  async getAllTeams(): Promise<Team[]> {
    try {
      return await this.teamRepository.find({
        relations: ["region", "queueAssignments"],
        order: { name: "ASC" }
      });
    } catch (error) {
      logger.error("Failed to get all teams", { error });
      throw error;
    }
  }

  /**
   * Get active teams only
   */
  async getActiveTeams(): Promise<Team[]> {
    try {
      return await this.teamRepository.find({
        where: { isActive: true },
        relations: ["region", "queueAssignments"],
        order: { name: "ASC" }
      });
    } catch (error) {
      logger.error("Failed to get active teams", { error });
      throw error;
    }
  }

  /**
   * Get teams by region
   */
  async getTeamsByRegion(regionId: string): Promise<Team[]> {
    try {
      return await this.teamRepository.find({
        where: { regionId },
        relations: ["region", "queueAssignments"],
        order: { name: "ASC" }
      });
    } catch (error) {
      logger.error("Failed to get teams by region", { error, regionId });
      throw error;
    }
  }

  /**
   * Get team by ID
   */
  async getTeamById(id: string): Promise<Team | null> {
    try {
      return await this.teamRepository.findOne({
        where: { id },
        relations: ["region", "queueAssignments"]
      });
    } catch (error) {
      logger.error("Failed to get team by ID", { error, id });
      throw error;
    }
  }

  /**
   * Create new team
   */
  async createTeam(teamData: CreateTeamData): Promise<Team> {
    try {
      logger.info("Creating new team", { teamData });

      // Verify region exists
      const region = await this.regionRepository.findOne({
        where: { id: teamData.regionId }
      });

      if (!region) {
        throw new Error("Region not found");
      }

      // Check if team with same name already exists in this region
      const existingTeam = await this.teamRepository.findOne({
        where: { 
          name: teamData.name,
          regionId: teamData.regionId
        }
      });

      if (existingTeam) {
        throw new Error("Team with this name already exists in this region");
      }

      const team = this.teamRepository.create({
        ...teamData,
        isActive: teamData.isActive ?? true
      });

      const savedTeam = await this.teamRepository.save(team);

      logger.info("Created new team", {
        id: savedTeam.id,
        name: savedTeam.name,
        regionId: savedTeam.regionId
      });

      return savedTeam;
    } catch (error) {
      logger.error("Failed to create team", { error, teamData });
      throw error;
    }
  }

  /**
   * Update team
   */
  async updateTeam(id: string, updateData: UpdateTeamData): Promise<Team> {
    try {
      logger.info("Updating team", { id, updateData });

      const team = await this.teamRepository.findOne({ 
        where: { id },
        relations: ["region"]
      });
      
      if (!team) {
        throw new Error("Team not found");
      }

      // If changing region, verify new region exists
      if (updateData.regionId && updateData.regionId !== team.regionId) {
        const region = await this.regionRepository.findOne({
          where: { id: updateData.regionId }
        });

        if (!region) {
          throw new Error("Region not found");
        }
      }

      // Check if new name conflicts with existing team in the same region
      if (updateData.name && updateData.name !== team.name) {
        const targetRegionId = updateData.regionId || team.regionId;
        const existingTeam = await this.teamRepository.findOne({
          where: { 
            name: updateData.name,
            regionId: targetRegionId
          }
        });

        if (existingTeam) {
          throw new Error("Team with this name already exists in this region");
        }
      }

      Object.assign(team, updateData);
      const updatedTeam = await this.teamRepository.save(team);

      logger.info("Updated team", {
        id: updatedTeam.id,
        name: updatedTeam.name,
        regionId: updatedTeam.regionId
      });

      return updatedTeam;
    } catch (error) {
      logger.error("Failed to update team", { error, id, updateData });
      throw error;
    }
  }

  /**
   * Delete team
   */
  async deleteTeam(id: string): Promise<void> {
    try {
      logger.info("Deleting team", { id });

      const team = await this.teamRepository.findOne({
        where: { id },
        relations: ["queueAssignments"]
      });

      if (!team) {
        throw new Error("Team not found");
      }

      if (team.queueAssignments && team.queueAssignments.length > 0) {
        throw new Error("Cannot delete team with assigned queues. Please reassign queues first.");
      }

      await this.teamRepository.remove(team);

      logger.info("Deleted team", { id, name: team.name });
    } catch (error) {
      logger.error("Failed to delete team", { error, id });
      throw error;
    }
  }

  /**
   * Get team statistics
   */
  async getTeamStats(): Promise<{
    totalTeams: number;
    activeTeams: number;
    totalQueues: number;
    teamsByRegion: Record<string, number>;
  }> {
    try {
      const teams = await this.teamRepository.find({
        relations: ["region", "queueAssignments"]
      });

      const totalTeams = teams.length;
      const activeTeams = teams.filter(t => t.isActive).length;
      const totalQueues = teams.reduce((sum, t) => sum + (t.queueAssignments?.length || 0), 0);
      
      const teamsByRegion: Record<string, number> = {};
      teams.forEach(team => {
        const regionName = team.region?.name || 'Unknown';
        teamsByRegion[regionName] = (teamsByRegion[regionName] || 0) + 1;
      });

      return {
        totalTeams,
        activeTeams,
        totalQueues,
        teamsByRegion
      };
    } catch (error) {
      logger.error("Failed to get team stats", { error });
      throw error;
    }
  }
}
