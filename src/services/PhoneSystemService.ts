import axios, { AxiosInstance } from "axios";
import { logger, logPhoneSystemAction } from "../utils/logger";
import { config } from "../config";

export interface PhoneUsageData {
  call_id: string;
  client_id: string;
  started_at: string;
  ended_at: string;
  billable_seconds: number;
  started_pst: string;
  ended_pst: string;
}

export class PhoneSystemService {
  private api: AxiosInstance;
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second

  constructor() {
    this.api = axios.create({
      baseURL: config.phoneSystem.baseUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${config.phoneSystem.apiKey}`,
      },
    });

    // Add request interceptor for authentication
    this.api.interceptors.request.use((config) => {
      // Add API key to headers
      config.headers["X-API-Key"] = config.phoneSystem.apiKey;
      config.headers["X-API-Secret"] = config.phoneSystem.apiSecret;

      return config;
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status >= 500) {
          // Server error, retry with exponential backoff
          return this.retryRequest(error.config);
        }
        throw error;
      }
    );
  }

  /**
   * Get usage data for a specific date range
   */
  async getUsageData(
    startDate: Date,
    endDate: Date,
    clientId?: string
  ): Promise<PhoneUsageData[]> {
    try {
      logPhoneSystemAction("get_usage_data", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        clientId,
      });

      const params: any = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        format: "json",
      };

      if (clientId) {
        params.client_id = clientId;
      }

      const response = await this.api.get("/api/v1/usage", { params });

      const usageData = response.data.data || response.data || [];

      // Validate and transform the data
      const validatedData = this.validateUsageData(usageData);

      logPhoneSystemAction("get_usage_data", {
        success: true,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        clientId,
        recordCount: validatedData.length,
      });

      return validatedData;
    } catch (error) {
      logger.error("Failed to get phone usage data", {
        error,
        startDate,
        endDate,
        clientId,
      });
      logPhoneSystemAction("get_usage_data", {
        success: false,
        error: error.message,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        clientId,
      });
      throw new Error(`Failed to get phone usage data: ${error.message}`);
    }
  }

  /**
   * Get usage data for a specific client
   */
  async getClientUsageData(
    clientId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PhoneUsageData[]> {
    return this.getUsageData(startDate, endDate, clientId);
  }

  /**
   * Get real-time usage data
   */
  async getRealTimeUsage(): Promise<PhoneUsageData[]> {
    try {
      const response = await this.api.get("/api/v1/usage/realtime");

      const usageData = response.data.data || response.data || [];
      const validatedData = this.validateUsageData(usageData);

      logPhoneSystemAction("get_realtime_usage", {
        success: true,
        recordCount: validatedData.length,
      });

      return validatedData;
    } catch (error) {
      logger.error("Failed to get real-time usage data", { error });
      logPhoneSystemAction("get_realtime_usage", {
        success: false,
        error: error.message,
      });
      throw new Error(`Failed to get real-time usage data: ${error.message}`);
    }
  }

  /**
   * Get client list
   */
  async getClients(): Promise<any[]> {
    try {
      const response = await this.api.get("/api/v1/clients");

      const clients = response.data.data || response.data || [];

      logPhoneSystemAction("get_clients", {
        success: true,
        count: clients.length,
      });

      return clients;
    } catch (error) {
      logger.error("Failed to get client list", { error });
      logPhoneSystemAction("get_clients", {
        success: false,
        error: error.message,
      });
      throw new Error(`Failed to get client list: ${error.message}`);
    }
  }

  /**
   * Get client details
   */
  async getClientDetails(clientId: string): Promise<any> {
    try {
      const response = await this.api.get(`/api/v1/clients/${clientId}`);

      const client = response.data.data || response.data;

      logPhoneSystemAction("get_client_details", {
        success: true,
        clientId,
      });

      return client;
    } catch (error) {
      logger.error("Failed to get client details", { error, clientId });
      logPhoneSystemAction("get_client_details", {
        success: false,
        error: error.message,
        clientId,
      });
      throw new Error(`Failed to get client details: ${error.message}`);
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.api.get("/api/v1/health");
      return response.status === 200;
    } catch (error) {
      logger.error("Phone system connection test failed", { error });
      return false;
    }
  }

  /**
   * Validate usage data structure
   */
  private validateUsageData(data: any[]): PhoneUsageData[] {
    const validatedData: PhoneUsageData[] = [];

    for (const record of data) {
      try {
        // Check required fields
        if (
          !record.call_id ||
          !record.client_id ||
          !record.started_at ||
          !record.ended_at
        ) {
          logger.warn("Invalid usage record, missing required fields", {
            record,
          });
          continue;
        }

        // Validate billable seconds
        if (
          typeof record.billable_seconds !== "number" ||
          record.billable_seconds < 0
        ) {
          logger.warn("Invalid billable seconds in usage record", { record });
          continue;
        }

        // Validate dates
        const startedAt = new Date(record.started_at);
        const endedAt = new Date(record.ended_at);

        if (isNaN(startedAt.getTime()) || isNaN(endedAt.getTime())) {
          logger.warn("Invalid dates in usage record", { record });
          continue;
        }

        // Validate PST dates if provided
        let startedPst = record.started_pst;
        let endedPst = record.ended_pst;

        if (startedPst && endedPst) {
          const startedPstDate = new Date(startedPst);
          const endedPstDate = new Date(endedPst);

          if (
            isNaN(startedPstDate.getTime()) ||
            isNaN(endedPstDate.getTime())
          ) {
            logger.warn("Invalid PST dates in usage record", { record });
            // Use UTC dates as fallback
            startedPst = record.started_at;
            endedPst = record.ended_at;
          }
        } else {
          // If PST dates not provided, use UTC dates
          startedPst = record.started_at;
          endedPst = record.ended_at;
        }

        const validatedRecord: PhoneUsageData = {
          call_id: record.call_id,
          client_id: record.client_id,
          started_at: record.started_at,
          ended_at: record.ended_at,
          billable_seconds: record.billable_seconds,
          started_pst: startedPst,
          ended_pst: endedPst,
        };

        validatedData.push(validatedRecord);
      } catch (error) {
        logger.error("Error validating usage record", { error, record });
      }
    }

    return validatedData;
  }

  /**
   * Retry request with exponential backoff
   */
  private async retryRequest(config: any, attempt: number = 1): Promise<any> {
    if (attempt > this.retryAttempts) {
      throw new Error(`Max retry attempts (${this.retryAttempts}) exceeded`);
    }

    try {
      // Wait before retrying
      await new Promise((resolve) =>
        setTimeout(resolve, this.retryDelay * Math.pow(2, attempt - 1))
      );

      logger.info(`Retrying request, attempt ${attempt}/${this.retryAttempts}`);

      return await this.api.request(config);
    } catch (error) {
      if (attempt < this.retryAttempts) {
        return this.retryRequest(config, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Parse CSV data (for testing with the provided CSV file)
   */
  parseCSVData(csvContent: string): PhoneUsageData[] {
    const lines = csvContent.trim().split("\n");
    const headers = lines[0].split(",");
    const data: PhoneUsageData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      const record: any = {};

      headers.forEach((header, index) => {
        record[header.trim()] = values[index]?.trim();
      });

      // Convert to PhoneUsageData format
      const usageData: PhoneUsageData = {
        call_id: record.call_id,
        client_id: record.client_id,
        started_at: record.started_at,
        ended_at: record.ended_at,
        billable_seconds: parseInt(record.billable_seconds),
        started_pst: record.started_pst,
        ended_pst: record.ended_pst,
      };

      data.push(usageData);
    }

    return data;
  }
}
