import { getRepository, Repository } from "typeorm";
import { Region } from "../entities/Region";
import { logger } from "../utils/logger";

export interface CreateRegionData {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateRegionData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export class RegionService {
  private get regionRepository(): Repository<Region> {
    return getRepository(Region);
  }

  /**
   * Get all regions
   */
  async getAllRegions(): Promise<Region[]> {
    try {
      return await this.regionRepository.find({
        relations: ["teams"],
        order: { name: "ASC" }
      });
    } catch (error) {
      logger.error("Failed to get all regions", { error });
      throw error;
    }
  }

  /**
   * Get active regions only
   */
  async getActiveRegions(): Promise<Region[]> {
    try {
      return await this.regionRepository.find({
        where: { isActive: true },
        relations: ["teams"],
        order: { name: "ASC" }
      });
    } catch (error) {
      logger.error("Failed to get active regions", { error });
      throw error;
    }
  }

  /**
   * Get region by ID
   */
  async getRegionById(id: string): Promise<Region | null> {
    try {
      return await this.regionRepository.findOne({
        where: { id },
        relations: ["teams"]
      });
    } catch (error) {
      logger.error("Failed to get region by ID", { error, id });
      throw error;
    }
  }

  /**
   * Create new region
   */
  async createRegion(regionData: CreateRegionData): Promise<Region> {
    try {
      logger.info("Creating new region", { regionData });

      // Check if region with same name already exists
      const existingRegion = await this.regionRepository.findOne({
        where: { name: regionData.name }
      });

      if (existingRegion) {
        throw new Error("Region with this name already exists");
      }

      const region = this.regionRepository.create({
        ...regionData,
        isActive: regionData.isActive ?? true
      });

      const savedRegion = await this.regionRepository.save(region);

      logger.info("Created new region", {
        id: savedRegion.id,
        name: savedRegion.name
      });

      return savedRegion;
    } catch (error) {
      logger.error("Failed to create region", { error, regionData });
      throw error;
    }
  }

  /**
   * Update region
   */
  async updateRegion(id: string, updateData: UpdateRegionData): Promise<Region> {
    try {
      logger.info("Updating region", { id, updateData });

      const region = await this.regionRepository.findOne({ where: { id } });
      if (!region) {
        throw new Error("Region not found");
      }

      // Check if new name conflicts with existing region
      if (updateData.name && updateData.name !== region.name) {
        const existingRegion = await this.regionRepository.findOne({
          where: { name: updateData.name }
        });

        if (existingRegion) {
          throw new Error("Region with this name already exists");
        }
      }

      Object.assign(region, updateData);
      const updatedRegion = await this.regionRepository.save(region);

      logger.info("Updated region", {
        id: updatedRegion.id,
        name: updatedRegion.name
      });

      return updatedRegion;
    } catch (error) {
      logger.error("Failed to update region", { error, id, updateData });
      throw error;
    }
  }

  /**
   * Delete region
   */
  async deleteRegion(id: string): Promise<void> {
    try {
      logger.info("Deleting region", { id });

      const region = await this.regionRepository.findOne({
        where: { id },
        relations: ["teams"]
      });

      if (!region) {
        throw new Error("Region not found");
      }

      if (region.teams && region.teams.length > 0) {
        throw new Error("Cannot delete region with existing teams. Please delete or reassign teams first.");
      }

      await this.regionRepository.remove(region);

      logger.info("Deleted region", { id, name: region.name });
    } catch (error) {
      logger.error("Failed to delete region", { error, id });
      throw error;
    }
  }

  /**
   * Get region statistics
   */
  async getRegionStats(): Promise<{
    totalRegions: number;
    activeRegions: number;
    totalTeams: number;
    activeTeams: number;
  }> {
    try {
      const regions = await this.regionRepository.find({
        relations: ["teams"]
      });

      const totalRegions = regions.length;
      const activeRegions = regions.filter(r => r.isActive).length;
      const totalTeams = regions.reduce((sum, r) => sum + (r.teams?.length || 0), 0);
      const activeTeams = regions.reduce((sum, r) => sum + (r.getActiveTeamCount()), 0);

      return {
        totalRegions,
        activeRegions,
        totalTeams,
        activeTeams
      };
    } catch (error) {
      logger.error("Failed to get region stats", { error });
      throw error;
    }
  }
}
