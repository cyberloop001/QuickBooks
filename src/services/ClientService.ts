import { getRepository, Like, FindManyOptions, Repository } from "typeorm";
import { Client } from "../entities/Client";
import { PhoneUsage } from "../entities/PhoneUsage";
import { logger } from "../utils/logger";

export interface CreateClientData {
  name: string;
  genesysClientId: string;
  qboCustomerId?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  ratePerMinute?: number;
  taxCode?: string;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateClientData {
  name?: string;
  qboCustomerId?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  ratePerMinute?: number;
  taxCode?: string;
  notes?: string;
  isActive?: boolean;
}

export interface ClientFilters {
  search?: string;
  isActive?: boolean;
  hasQboCustomerId?: boolean;
}

export interface ClientListResult {
  clients: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class ClientService {
  private get clientRepository(): Repository<Client> {
    return getRepository(Client);
  }

  private get phoneUsageRepository(): Repository<PhoneUsage> {
    return getRepository(PhoneUsage);
  }

  /**
   * Get all clients with pagination and filtering
   */
  async getClients(
    page: number = 1,
    limit: number = 20,
    filters: ClientFilters = {}
  ): Promise<ClientListResult> {
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

      // Build search conditions
      let searchConditions: any[] = [];
      if (filters.search) {
        searchConditions = [
          { name: Like(`%${filters.search}%`) },
          { genesysClientId: Like(`%${filters.search}%`) },
          { qboCustomerId: Like(`%${filters.search}%`) },
          { email: Like(`%${filters.search}%`) },
        ];
      }

      // Build find options
      const findOptions: FindManyOptions<Client> = {
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

      const [clients, total] = await this.clientRepository.findAndCount(
        findOptions
      );

      const pages = Math.ceil(total / limit);

      logger.info("Retrieved clients", {
        count: clients.length,
        total,
        page,
        limit,
        filters,
      });

      return {
        clients,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      logger.error("Failed to get clients", { error, page, limit, filters });
      throw new Error("Failed to retrieve clients");
    }
  }

  /**
   * Get client by ID
   */
  async getClientById(id: string): Promise<Client> {
    try {
      const client = await this.clientRepository.findOne({
        where: { id },
        relations: ["phoneUsages"],
      });

      if (!client) {
        throw new Error("Client not found");
      }

      logger.info("Retrieved client by ID", { id, clientName: client.name });
      return client;
    } catch (error) {
      logger.error("Failed to get client by ID", { error, id });
      throw error;
    }
  }

  /**
   * Get client by Genesys Client ID
   */
  async getClientByGenesysId(genesysClientId: string): Promise<Client | null> {
    try {
      const client = await this.clientRepository.findOne({
        where: { genesysClientId },
        relations: ["phoneUsages"],
      });

      if (client) {
        logger.info("Retrieved client by Genesys ID", {
          genesysClientId,
          clientName: client.name,
        });
      }

      return client;
    } catch (error) {
      logger.error("Failed to get client by Genesys ID", {
        error,
        genesysClientId,
      });
      throw new Error("Failed to retrieve client by Genesys ID");
    }
  }

  /**
   * Get client by QBO Customer ID
   */
  async getClientByQBOCustomerId(
    qboCustomerId: string
  ): Promise<Client | null> {
    try {
      const client = await this.clientRepository.findOne({
        where: { qboCustomerId },
        relations: ["phoneUsages"],
      });

      if (client) {
        logger.info("Retrieved client by QBO Customer ID", {
          qboCustomerId,
          clientName: client.name,
        });
      }

      return client;
    } catch (error) {
      logger.error("Failed to get client by QBO Customer ID", {
        error,
        qboCustomerId,
      });
      throw new Error("Failed to retrieve client by QBO Customer ID");
    }
  }

  /**
   * Create new client
   */
  async createClient(clientData: CreateClientData): Promise<Client> {
    try {
      // Check if genesysClientId already exists
      logger.info("Creating new client", { clientData });
      const existingClient = await this.clientRepository.findOne({
        where: { genesysClientId: clientData.genesysClientId },
      });

      if (existingClient) {
        throw new Error("Client with this Genesys Client ID already exists");
      }

      // Check if qboCustomerId already exists (if provided)
      if (clientData.qboCustomerId) {
        const existingQBOClient = await this.clientRepository.findOne({
          where: { qboCustomerId: clientData.qboCustomerId },
        });

        if (existingQBOClient) {
          throw new Error("Client with this QBO Customer ID already exists");
        }
      }

      const client = this.clientRepository.create({
        ...clientData,
        isActive: clientData.isActive ?? true,
        ratePerMinute: clientData.ratePerMinute ?? 1.0,
      });

      const savedClient = await this.clientRepository.save(client);

      logger.info("Created new client", {
        id: savedClient.id,
        name: savedClient.name,
        genesysClientId: savedClient.genesysClientId,
      });

      return savedClient;
    } catch (error) {
      logger.error("Failed to create client", { error, clientData });
      throw error;
    }
  }

  /**
   * Update client
   */
  async updateClient(
    id: string,
    updateData: UpdateClientData
  ): Promise<Client> {
    try {
      const client = await this.clientRepository.findOne({ where: { id } });

      if (!client) {
        throw new Error("Client not found");
      }

      // Check if qboCustomerId already exists (if being updated)
      if (
        updateData.qboCustomerId &&
        updateData.qboCustomerId !== client.qboCustomerId
      ) {
        const existingQBOClient = await this.clientRepository.findOne({
          where: { qboCustomerId: updateData.qboCustomerId },
        });

        if (existingQBOClient) {
          throw new Error("Client with this QBO Customer ID already exists");
        }
      }

      // Update client
      Object.assign(client, updateData);
      const updatedClient = await this.clientRepository.save(client);

      logger.info("Updated client", {
        id,
        name: updatedClient.name,
        updateData,
      });

      return updatedClient;
    } catch (error) {
      logger.error("Failed to update client", { error, id, updateData });
      throw error;
    }
  }

  /**
   * Delete client
   */
  async deleteClient(id: string): Promise<void> {
    try {
      const client = await this.clientRepository.findOne({
        where: { id },
        relations: ["phoneUsages"],
      });

      if (!client) {
        throw new Error("Client not found");
      }

      // Check if client has phone usage records
      if (client.phoneUsages && client.phoneUsages.length > 0) {
        throw new Error(
          "Cannot delete client with existing phone usage records"
        );
      }

      await this.clientRepository.remove(client);

      logger.info("Deleted client", { id, name: client.name });
    } catch (error) {
      logger.error("Failed to delete client", { error, id });
      throw error;
    }
  }

  /**
   * Get client statistics
   */
  async getClientStats(clientId: string): Promise<{
    totalCalls: number;
    totalMinutes: number;
    totalAmount: number;
    lastCallDate: Date | null;
    averageCallDuration: number;
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
        .where("usage.clientId = :clientId", { clientId })
        .getRawOne();

      return {
        totalCalls: parseInt(stats.totalCalls) || 0,
        totalMinutes: parseFloat(stats.totalMinutes) || 0,
        totalAmount: parseFloat(stats.totalAmount) || 0,
        lastCallDate: stats.lastCallDate ? new Date(stats.lastCallDate) : null,
        averageCallDuration: parseFloat(stats.averageCallDuration) || 0,
      };
    } catch (error) {
      logger.error("Failed to get client stats", { error, clientId });
      throw new Error("Failed to retrieve client statistics");
    }
  }

  /**
   * Get all active clients
   */
  async getActiveClients(): Promise<Client[]> {
    try {
      const clients = await this.clientRepository.find({
        where: { isActive: true },
        order: { name: "ASC" },
      });

      logger.info("Retrieved active clients", { count: clients.length });
      return clients;
    } catch (error) {
      logger.error("Failed to get active clients", { error });
      throw new Error("Failed to retrieve active clients");
    }
  }

  /**
   * Bulk update client status
   */
  async bulkUpdateStatus(
    clientIds: string[],
    isActive: boolean
  ): Promise<void> {
    try {
      await this.clientRepository
        .createQueryBuilder()
        .update(Client)
        .set({ isActive })
        .whereInIds(clientIds)
        .execute();

      logger.info("Bulk updated client status", {
        clientIds,
        isActive,
        count: clientIds.length,
      });
    } catch (error) {
      logger.error("Failed to bulk update client status", {
        error,
        clientIds,
        isActive,
      });
      throw new Error("Failed to bulk update client status");
    }
  }

  /**
   * Search clients by name or ID
   */
  async searchClients(query: string, limit: number = 10): Promise<Client[]> {
    try {
      const clients = await this.clientRepository.find({
        where: [
          { name: Like(`%${query}%`) },
          { genesysClientId: Like(`%${query}%`) },
          { qboCustomerId: Like(`%${query}%`) },
        ],
        take: limit,
        order: { name: "ASC" },
      });

      logger.info("Searched clients", { query, count: clients.length });
      return clients;
    } catch (error) {
      logger.error("Failed to search clients", { error, query });
      throw new Error("Failed to search clients");
    }
  }
}
