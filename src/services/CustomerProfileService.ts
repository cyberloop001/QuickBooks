import { getRepository, Repository, Like, FindManyOptions, In } from "typeorm";
import { CustomerProfile } from "../entities/CustomerProfile";
import { PhoneUsage } from "../entities/PhoneUsage";
import { logger } from "../utils/logger";

export interface CreateCustomerProfileData {
  qboCustomerId?: string;
  genesysQueueNames: string[];
  ratePerMinute?: number;
  taxCode?: string;
  notes?: string;
  isActive?: boolean;

  // QBO Customer Fields
  qboDisplayName: string; // Required
  qboCompanyName?: string;
  qboGivenName?: string;
  qboFamilyName?: string;
  qboMiddleName?: string;
  qboTitle?: string;
  qboSuffix?: string;

  // QBO Contact Fields
  qboPrimaryEmailAddr?: string;
  qboPrimaryPhone?: string;

  // QBO Address Fields
  qboLine1?: string;
  qboCity?: string;
  qboCountrySubDivisionCode?: string;
  qboPostalCode?: string;
  qboCountry?: string;
}

export interface UpdateCustomerProfileData {
  qboCustomerId?: string;
  genesysQueueNames?: string[];
  ratePerMinute?: number;
  taxCode?: string;
  notes?: string;
  isActive?: boolean;

  // QBO Customer Fields
  qboDisplayName?: string;
  qboCompanyName?: string;
  qboGivenName?: string;
  qboFamilyName?: string;
  qboMiddleName?: string;
  qboTitle?: string;
  qboSuffix?: string;

  // QBO Contact Fields
  qboPrimaryEmailAddr?: string;
  qboPrimaryPhone?: string;

  // QBO Address Fields
  qboLine1?: string;
  qboCity?: string;
  qboCountrySubDivisionCode?: string;
  qboPostalCode?: string;
  qboCountry?: string;

  // QBO Metadata
  qboMetadata?: any;
}

export interface CustomerProfileFilters {
  search?: string;
  isActive?: boolean;
  hasQboCustomerId?: boolean;
  hasGenesysQueues?: boolean;
  queueName?: string;
}

export interface CustomerProfileListResult {
  customerProfiles: CustomerProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class CustomerProfileService {
  private get customerProfileRepository(): Repository<CustomerProfile> {
    return getRepository(CustomerProfile);
  }

  private get phoneUsageRepository(): Repository<PhoneUsage> {
    return getRepository(PhoneUsage);
  }

  /**
   * Get all customer profiles with pagination and filtering
   */
  async getCustomerProfiles(
    page: number = 1,
    limit: number = 20,
    filters: CustomerProfileFilters = {}
  ): Promise<CustomerProfileListResult> {
    try {
      const skip = (page - 1) * limit;

      // Build where conditions
      const whereConditions: any = {};

      if (filters.isActive !== undefined) {
        whereConditions.isActive = filters.isActive;
      }

      if (filters.hasQboCustomerId !== undefined) {
        if (filters.hasQboCustomerId) {
          whereConditions.qboCustomerId = Like("%");
        } else {
          whereConditions.qboCustomerId = null;
        }
      }

      if (filters.hasGenesysQueues !== undefined) {
        if (filters.hasGenesysQueues) {
          whereConditions.genesysQueueNames =
            "array_length(genesysQueueNames, 1) > 0";
        } else {
          whereConditions.genesysQueueNames =
            "array_length(genesysQueueNames, 1) IS NULL OR array_length(genesysQueueNames, 1) = 0";
        }
      }

      // Build search conditions
      let searchConditions: any[] = [];
      if (filters.search) {
        searchConditions = [
          { qboDisplayName: Like(`%${filters.search}%`) },
          { qboCustomerId: Like(`%${filters.search}%`) },
          { qboPrimaryEmailAddr: Like(`%${filters.search}%`) },
          { qboCompanyName: Like(`%${filters.search}%`) },
          { qboGivenName: Like(`%${filters.search}%`) },
          { qboFamilyName: Like(`%${filters.search}%`) },
        ];
      }

      // Build find options
      const findOptions: FindManyOptions<CustomerProfile> = {
        where: searchConditions.length > 0 ? searchConditions : whereConditions,
        skip,
        take: limit,
        order: { createdAt: "DESC" },
        relations: ["phoneUsages"],
      };

      // If we have specific filters and search, combine them
      if (
        searchConditions.length > 0 &&
        Object.keys(whereConditions).length > 0
      ) {
        findOptions.where = searchConditions.map((condition) => ({
          ...condition,
          ...whereConditions,
        }));
      }

      // Check if we need to use query builder for array operations
      const needsQueryBuilder = Object.values(whereConditions).some(
        (value) => typeof value === "string" && value.includes("array_length")
      );

      if (needsQueryBuilder) {
        // Use query builder for array operations
        const queryBuilder = this.customerProfileRepository
          .createQueryBuilder("profile")
          .leftJoinAndSelect("profile.phoneUsages", "phoneUsages");

        // Apply array conditions
        if (filters.hasGenesysQueues !== undefined) {
          if (filters.hasGenesysQueues) {
            queryBuilder.andWhere(
              "array_length(profile.genesysQueueNames, 1) > 0"
            );
          } else {
            queryBuilder.andWhere(
              "(array_length(profile.genesysQueueNames, 1) IS NULL OR array_length(profile.genesysQueueNames, 1) = 0)"
            );
          }
        }

        if (filters.hasQboCustomerId !== undefined) {
          if (filters.hasQboCustomerId) {
            queryBuilder.andWhere(
              "profile.qboCustomerId IS NOT NULL AND profile.qboCustomerId != ''"
            );
          } else {
            queryBuilder.andWhere(
              "(profile.qboCustomerId IS NULL OR profile.qboCustomerId = '')"
            );
          }
        }

        if (filters.isActive !== undefined) {
          queryBuilder.andWhere("profile.isActive = :isActive", {
            isActive: filters.isActive,
          });
        }

        // Apply search conditions
        if (searchConditions.length > 0) {
          searchConditions.forEach((condition, index) => {
            const key = Object.keys(condition)[0];
            const value = condition[key];
            if (key === "qboDisplayName") {
              queryBuilder.andWhere(
                `profile.qboDisplayName LIKE :search${index}`,
                {
                  [`search${index}`]: value,
                }
              );
            } else if (key === "qboCustomerId") {
              queryBuilder.andWhere(
                `profile.qboCustomerId LIKE :search${index}`,
                {
                  [`search${index}`]: value,
                }
              );
            } else if (key === "qboPrimaryEmailAddr") {
              queryBuilder.andWhere(
                `profile.qboPrimaryEmailAddr LIKE :search${index}`,
                {
                  [`search${index}`]: value,
                }
              );
            } else if (key === "qboCompanyName") {
              queryBuilder.andWhere(
                `profile.qboCompanyName LIKE :search${index}`,
                {
                  [`search${index}`]: value,
                }
              );
            } else if (key === "qboGivenName") {
              queryBuilder.andWhere(
                `profile.qboGivenName LIKE :search${index}`,
                {
                  [`search${index}`]: value,
                }
              );
            } else if (key === "qboFamilyName") {
              queryBuilder.andWhere(
                `profile.qboFamilyName LIKE :search${index}`,
                {
                  [`search${index}`]: value,
                }
              );
            }
          });
        }

        queryBuilder
          .skip(skip)
          .take(limit)
          .orderBy("profile.createdAt", "DESC");

        const [customerProfiles, total] = await queryBuilder.getManyAndCount();
        const pages = Math.ceil(total / limit);

        logger.info("Retrieved customer profiles with query builder", {
          count: customerProfiles.length,
          total,
          page,
          limit,
          filters,
        });

        return {
          customerProfiles,
          pagination: {
            page,
            limit,
            total,
            pages,
          },
        };
      }

      // Filter by specific queue name if provided
      if (filters.queueName) {
        const queryBuilder = this.customerProfileRepository
          .createQueryBuilder("profile")
          .leftJoinAndSelect("profile.phoneUsages", "phoneUsages")
          .where(":queueName = ANY(profile.genesysQueueNames)", {
            queueName: filters.queueName,
          });

        if (searchConditions.length > 0) {
          // Apply search conditions
          searchConditions.forEach((condition, index) => {
            const key = Object.keys(condition)[0];
            const value = condition[key];
            if (key === "qboDisplayName") {
              queryBuilder.andWhere(
                `profile.qboDisplayName LIKE :search${index}`,
                {
                  [`search${index}`]: value,
                }
              );
            } else if (key === "qboCustomerId") {
              queryBuilder.andWhere(
                `profile.qboCustomerId LIKE :search${index}`,
                {
                  [`search${index}`]: value,
                }
              );
            } else if (key === "qboPrimaryEmailAddr") {
              queryBuilder.andWhere(
                `profile.qboPrimaryEmailAddr LIKE :search${index}`,
                {
                  [`search${index}`]: value,
                }
              );
            } else if (key === "qboCompanyName") {
              queryBuilder.andWhere(
                `profile.qboCompanyName LIKE :search${index}`,
                {
                  [`search${index}`]: value,
                }
              );
            } else if (key === "qboGivenName") {
              queryBuilder.andWhere(
                `profile.qboGivenName LIKE :search${index}`,
                {
                  [`search${index}`]: value,
                }
              );
            } else if (key === "qboFamilyName") {
              queryBuilder.andWhere(
                `profile.qboFamilyName LIKE :search${index}`,
                {
                  [`search${index}`]: value,
                }
              );
            }
          });
        }

        if (filters.isActive !== undefined) {
          queryBuilder.andWhere("profile.isActive = :isActive", {
            isActive: filters.isActive,
          });
        }

        queryBuilder
          .skip(skip)
          .take(limit)
          .orderBy("profile.createdAt", "DESC");

        const [customerProfiles, total] = await queryBuilder.getManyAndCount();
        const pages = Math.ceil(total / limit);

        logger.info("Retrieved customer profiles with queue filter", {
          count: customerProfiles.length,
          total,
          page,
          limit,
          filters,
        });

        return {
          customerProfiles,
          pagination: {
            page,
            limit,
            total,
            pages,
          },
        };
      }

      const [customerProfiles, total] =
        await this.customerProfileRepository.findAndCount(findOptions);

      const pages = Math.ceil(total / limit);

      logger.info("Retrieved customer profiles", {
        count: customerProfiles.length,
        total,
        page,
        limit,
        filters,
      });

      return {
        customerProfiles,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      logger.error("Failed to get customer profiles", {
        error,
        page,
        limit,
        filters,
      });
      throw new Error("Failed to retrieve customer profiles");
    }
  }

  /**
   * Get customer profile by ID
   */
  async getCustomerProfileById(id: string): Promise<CustomerProfile> {
    try {
      const profile = await this.customerProfileRepository.findOne({
        where: { id },
        relations: ["phoneUsages"],
      });

      if (!profile) {
        throw new Error("Customer profile not found");
      }

      logger.info("Retrieved customer profile by ID", {
        id,
        profileName: profile.qboDisplayName,
      });
      return profile;
    } catch (error) {
      logger.error("Failed to get customer profile by ID", { error, id });
      throw error;
    }
  }

  /**
   * Get customer profile by QBO Customer ID
   */
  async getCustomerProfileByQBOCustomerId(
    qboCustomerId: string
  ): Promise<CustomerProfile | null> {
    try {
      const profile = await this.customerProfileRepository.findOne({
        where: { qboCustomerId },
        relations: ["phoneUsages"],
      });

      if (profile) {
        logger.info("Retrieved customer profile by QBO Customer ID", {
          qboCustomerId,
          profileName: profile.qboDisplayName,
        });
      }

      return profile;
    } catch (error) {
      logger.error("Failed to get customer profile by QBO Customer ID", {
        error,
        qboCustomerId,
      });
      throw new Error("Failed to retrieve customer profile by QBO Customer ID");
    }
  }

  /**
   * Get customer profile by Genesys queue name
   */
  async getCustomerProfileByQueueName(
    queueName: string
  ): Promise<CustomerProfile | null> {
    try {
      const profile = await this.customerProfileRepository
        .createQueryBuilder("profile")
        .where(":queueName = ANY(profile.genesysQueueNames)", { queueName })
        .leftJoinAndSelect("profile.phoneUsages", "phoneUsages")
        .getOne();

      if (profile) {
        logger.info("Retrieved customer profile by queue name", {
          queueName,
          profileName: profile.qboDisplayName,
        });
      }

      return profile;
    } catch (error) {
      logger.error("Failed to get customer profile by queue name", {
        error,
        queueName,
      });
      throw new Error("Failed to retrieve customer profile by queue name");
    }
  }

  /**
   * Create new customer profile
   */
  async createCustomerProfile(
    profileData: CreateCustomerProfileData
  ): Promise<CustomerProfile> {
    try {
      logger.info("Creating new customer profile", { profileData });

      // Check if qboCustomerId already exists (if provided)
      if (profileData.qboCustomerId) {
        const existingProfile = await this.customerProfileRepository.findOne({
          where: { qboCustomerId: profileData.qboCustomerId },
        });

        if (existingProfile) {
          throw new Error(
            "Customer profile with this QBO Customer ID already exists"
          );
        }
      }

      // Check if any of the queue names already exist
      if (
        profileData.genesysQueueNames &&
        profileData.genesysQueueNames.length > 0
      ) {
        for (const queueName of profileData.genesysQueueNames) {
          const existingProfile = await this.customerProfileRepository
            .createQueryBuilder("profile")
            .where(":queueName = ANY(profile.genesysQueueNames)", { queueName })
            .getOne();

          if (existingProfile) {
            throw new Error(
              `Queue name "${queueName}" is already assigned to customer "${existingProfile.qboDisplayName}"`
            );
          }
        }
      }

      const profile = this.customerProfileRepository.create({
        ...profileData,
        isActive: profileData.isActive ?? true,
        ratePerMinute: profileData.ratePerMinute ?? 1.0,
        genesysQueueNames: profileData.genesysQueueNames || [],
      });

      const savedProfile = await this.customerProfileRepository.save(profile);

      logger.info("Created new customer profile", {
        id: savedProfile.id,
        name: savedProfile.qboDisplayName,
        queueNames: savedProfile.genesysQueueNames,
      });

      return savedProfile;
    } catch (error) {
      logger.error("Failed to create customer profile", { error, profileData });
      throw error;
    }
  }

  /**
   * Update customer profile
   */
  async updateCustomerProfile(
    id: string,
    updateData: UpdateCustomerProfileData
  ): Promise<CustomerProfile> {
    try {
      const profile = await this.customerProfileRepository.findOne({
        where: { id },
      });

      if (!profile) {
        throw new Error("Customer profile not found");
      }

      // Check if qboCustomerId already exists (if being updated)
      if (
        updateData.qboCustomerId &&
        updateData.qboCustomerId !== profile.qboCustomerId
      ) {
        const existingProfile = await this.customerProfileRepository.findOne({
          where: { qboCustomerId: updateData.qboCustomerId },
        });

        if (existingProfile) {
          throw new Error(
            "Customer profile with this QBO Customer ID already exists"
          );
        }
      }

      // Check if any of the new queue names already exist
      if (updateData.genesysQueueNames) {
        for (const queueName of updateData.genesysQueueNames) {
          if (!profile.genesysQueueNames.includes(queueName)) {
            const existingProfile = await this.customerProfileRepository
              .createQueryBuilder("profile")
              .where(":queueName = ANY(profile.genesysQueueNames)", {
                queueName,
              })
              .andWhere("profile.id != :profileId", { profileId: profile.id })
              .getOne();

            if (existingProfile) {
              throw new Error(
                `Queue name "${queueName}" is already assigned to customer "${existingProfile.qboDisplayName}"`
              );
            }
          }
        }
      }

      // Update profile
      Object.assign(profile, updateData);
      const updatedProfile = await this.customerProfileRepository.save(profile);

      logger.info("Updated customer profile", {
        id,
        name: updatedProfile.qboDisplayName,
        updateData,
      });

      return updatedProfile;
    } catch (error) {
      logger.error("Failed to update customer profile", {
        error,
        id,
        updateData,
      });
      throw error;
    }
  }

  /**
   * Delete customer profile
   */
  async deleteCustomerProfile(id: string): Promise<void> {
    try {
      const profile = await this.customerProfileRepository.findOne({
        where: { id },
        relations: ["phoneUsages"],
      });

      if (!profile) {
        throw new Error("Customer profile not found");
      }

      // Check if profile has phone usage records
      if (profile.phoneUsages && profile.phoneUsages.length > 0) {
        throw new Error(
          "Cannot delete customer profile with existing phone usage records"
        );
      }

      await this.customerProfileRepository.remove(profile);

      logger.info("Deleted customer profile", {
        id,
        name: profile.qboDisplayName,
      });
    } catch (error) {
      logger.error("Failed to delete customer profile", { error, id });
      throw error;
    }
  }

  /**
   * Get customer profile statistics
   */
  async getCustomerProfileStats(profileId: string): Promise<{
    totalCalls: number;
    totalMinutes: number;
    totalAmount: number;
    lastCallDate: Date | null;
    averageCallDuration: number;
    queueUsage: Record<
      string,
      { calls: number; minutes: number; amount: number }
    >;
  }> {
    try {
      const stats = await this.phoneUsageRepository
        .createQueryBuilder("usage")
        .select([
          "COUNT(usage.id) as totalCalls",
          "SUM(usage.billableMinutes) as totalMinutes",
          "SUM(usage.amount) as totalAmount",
          "MAX(usage.startedAt) as lastCallDate",
          "AVG(usage.billableMinutes) as averageCallDuration",
        ])
        .where("usage.customerProfileId = :profileId", { profileId })
        .getRawOne();

      // Get queue-specific usage
      const queueStats = await this.phoneUsageRepository
        .createQueryBuilder("usage")
        .select([
          "usage.genesysQueueName as queueName",
          "COUNT(usage.id) as calls",
          "SUM(usage.billableMinutes) as minutes",
          "SUM(usage.amount) as amount",
        ])
        .where("usage.customerProfileId = :profileId", { profileId })
        .groupBy("usage.genesysQueueName")
        .getRawMany();

      const queueUsage: Record<
        string,
        { calls: number; minutes: number; amount: number }
      > = {};
      queueStats.forEach((stat) => {
        queueUsage[stat.queueName] = {
          calls: parseInt(stat.calls) || 0,
          minutes: parseFloat(stat.minutes) || 0,
          amount: parseFloat(stat.amount) || 0,
        };
      });

      return {
        totalCalls: parseInt(stats.totalCalls) || 0,
        totalMinutes: parseFloat(stats.totalMinutes) || 0,
        totalAmount: parseFloat(stats.totalAmount) || 0,
        lastCallDate: stats.lastCallDate ? new Date(stats.lastCallDate) : null,
        averageCallDuration: parseFloat(stats.averageCallDuration) || 0,
        queueUsage,
      };
    } catch (error) {
      logger.error("Failed to get customer profile stats", {
        error,
        profileId,
      });
      throw new Error("Failed to retrieve customer profile statistics");
    }
  }

  /**
   * Get all active customer profiles
   */
  async getActiveCustomerProfiles(): Promise<CustomerProfile[]> {
    try {
      const profiles = await this.customerProfileRepository.find({
        where: { isActive: true },
        order: { qboDisplayName: "ASC" },
      });

      logger.info("Retrieved active customer profiles", {
        count: profiles.length,
      });
      return profiles;
    } catch (error) {
      logger.error("Failed to get active customer profiles", { error });
      throw new Error("Failed to retrieve active customer profiles");
    }
  }

  /**
   * Bulk update customer profile status
   */
  async bulkUpdateStatus(
    profileIds: string[],
    isActive: boolean
  ): Promise<void> {
    try {
      await this.customerProfileRepository
        .createQueryBuilder()
        .update(CustomerProfile)
        .set({ isActive })
        .whereInIds(profileIds)
        .execute();

      logger.info("Bulk updated customer profile status", {
        profileIds,
        isActive,
        count: profileIds.length,
      });
    } catch (error) {
      logger.error("Failed to bulk update customer profile status", {
        error,
        profileIds,
        isActive,
      });
      throw new Error("Failed to bulk update customer profile status");
    }
  }

  /**
   * Search customer profiles by name, QBO ID, or queue names
   */
  async searchCustomerProfiles(
    query: string,
    limit: number = 10
  ): Promise<CustomerProfile[]> {
    try {
      const profiles = await this.customerProfileRepository.find({
        where: [
          { qboDisplayName: Like(`%${query}%`) },
          { qboCustomerId: Like(`%${query}%`) },
          { qboCompanyName: Like(`%${query}%`) },
          { qboGivenName: Like(`%${query}%`) },
          { qboFamilyName: Like(`%${query}%`) },
        ],
        take: limit,
        order: { qboDisplayName: "ASC" },
      });

      logger.info("Searched customer profiles", {
        query,
        count: profiles.length,
      });
      return profiles;
    } catch (error) {
      logger.error("Failed to search customer profiles", { error, query });
      throw new Error("Failed to search customer profiles");
    }
  }

  /**
   * Get all queue names across all customer profiles
   */
  async getAllQueueNames(): Promise<string[]> {
    try {
      const profiles = await this.customerProfileRepository.find({
        select: ["genesysQueueNames"],
        where: { isActive: true },
      });

      const allQueues = new Set<string>();
      profiles.forEach((profile) => {
        if (profile.genesysQueueNames) {
          profile.genesysQueueNames.forEach((queue) => allQueues.add(queue));
        }
      });

      const queueNames = Array.from(allQueues).sort();
      logger.info("Retrieved all queue names", { count: queueNames.length });
      return queueNames;
    } catch (error) {
      logger.error("Failed to get all queue names", { error });
      throw new Error("Failed to retrieve queue names");
    }
  }

  /**
   * Sync QBO customer data to profile
   */
  async syncQBOData(profileId: string, qboData: any): Promise<CustomerProfile> {
    try {
      const profile = await this.customerProfileRepository.findOne({
        where: { id: profileId },
      });

      if (!profile) {
        throw new Error("Customer profile not found");
      }

      // Update QBO-related fields
      const updateData: UpdateCustomerProfileData = {
        qboCompanyName: qboData.CompanyName || qboData.DisplayName,
        qboDisplayName: qboData.DisplayName,
        qboPrimaryEmailAddr: qboData.PrimaryEmailAddr?.Address,
        qboPrimaryPhone: qboData.PrimaryPhone?.FreeFormNumber,
        qboLine1: qboData.BillAddr?.Line1,
        qboCity: qboData.BillAddr?.City,
        qboCountrySubDivisionCode: qboData.BillAddr?.CountrySubDivisionCode,
        qboPostalCode: qboData.BillAddr?.PostalCode,
        qboCountry: qboData.BillAddr?.Country,
        qboMetadata: qboData,
      };

      Object.assign(profile, updateData);
      const updatedProfile = await this.customerProfileRepository.save(profile);

      logger.info("Synced QBO data to customer profile", {
        profileId,
        profileName: updatedProfile.qboDisplayName,
        qboCustomerId: updatedProfile.qboCustomerId,
      });

      return updatedProfile;
    } catch (error) {
      logger.error("Failed to sync QBO data", { error, profileId, qboData });
      throw error;
    }
  }
}
