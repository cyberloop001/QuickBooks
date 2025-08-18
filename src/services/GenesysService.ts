import axios, { AxiosInstance } from "axios";
import { logger, logGenesysAction } from "../utils/logger";
import { config } from "../config";

export interface GenesysCallRecord {
  conversationId: string;
  startTime: string;
  endTime: string;
  duration: number; // in seconds
  userId?: string;
  queueId?: string;
  customerId?: string;
  phoneNumber?: string;
  direction: "inbound" | "outbound";
  purpose?: string;
  outcome?: string;
  mediaType: "voice" | "chat" | "email";
}

export interface GenesysUser {
  id: string;
  name: string;
  email: string;
  division: {
    id: string;
    name: string;
  };
  department?: string;
  title?: string;
}

export interface GenesysQueue {
  id: string;
  name: string;
  description?: string;
  division: {
    id: string;
    name: string;
  };
}

export interface GenesysCallAnalytics {
  totalCalls: number;
  totalMinutes: number;
  averageCallDuration: number;
  callsByDate: Record<string, number>;
  callsByUser: Record<string, number>;
  callsByQueue: Record<string, number>;
}

export class GenesysService {
  private api: AxiosInstance | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.initializeAPIClient();
  }

  /**
   * Initialize API client with Genesys Cloud credentials
   */
  private initializeAPIClient(): void {
    try {
      this.api = axios.create({
        baseURL: config.genesys.baseUrl,
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      logger.info("Genesys Cloud API client initialized", {
        baseUrl: config.genesys.baseUrl,
        clientId: config.genesys.clientId ? "configured" : "not configured",
      });
    } catch (error) {
      logger.error("Failed to initialize Genesys Cloud API client", { error });
    }
  }

  /**
   * Get OAuth access token for Genesys Cloud
   */
  async authenticate(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      logger.info("Authenticating with Genesys Cloud...");

      // Create base64 encoded credentials for Basic authentication
      const credentials = Buffer.from(
        `${config.genesys.clientId}:${config.genesys.clientSecret}`
      ).toString("base64");

      // Create URLSearchParams for form data
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");

      const response = await axios.post(
        `${config.genesys.baseUrl.replace("api.", "login.")}/oauth/token`,
        params,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      const tokenData = response.data;
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = new Date(
        Date.now() + (tokenData.expires_in - 300) * 1000
      ); // 5 min buffer

      // Update API client with new token
      if (this.api) {
        this.api.defaults.headers.Authorization = `Bearer ${this.accessToken}`;
      }

      logger.info("Genesys Cloud authentication successful", {
        expiresIn: tokenData.expires_in,
        expiresAt: this.tokenExpiry,
      });

      logGenesysAction("authenticate", { success: true });
      return this.accessToken!;
    } catch (error) {
      logger.error("Failed to authenticate with Genesys Cloud", { error });
      logGenesysAction("authenticate", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error(
        `Genesys Cloud authentication failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Ensure valid access token
   */
  private async ensureValidToken(): Promise<string> {
    if (
      !this.accessToken ||
      !this.tokenExpiry ||
      new Date() >= this.tokenExpiry
    ) {
      return this.authenticate();
    }
    return this.accessToken;
  }

  /**
   * Get call detail records (CDRs) for a date range
   */
  async getCallRecords(
    startDate: Date,
    endDate: Date,
    userIds?: string[],
    queueIds?: string[]
  ): Promise<GenesysCallRecord[]> {
    if (!this.api) {
      throw new Error("API client not initialized");
    }

    try {
      await this.ensureValidToken();

      const startTime = startDate.toISOString();
      const endTime = endDate.toISOString();

      // Build query parameters
      const queryParams: any = {
        startTime,
        endTime,
        interval: "1d", // Daily aggregation
        metrics: ["nConversations", "tConversationDuration"],
        dimensions: [
          "conversationId",
          "startTime",
          "endTime",
          "userId",
          "queueId",
          "direction",
          "mediaType",
        ],
        filters: [
          {
            type: "and",
            predicates: [
              {
                dimension: "mediaType",
                value: "voice",
              },
            ],
          },
        ],
      };

      // Add user filters if specified
      if (userIds && userIds.length > 0) {
        queryParams.filters[0].predicates.push({
          dimension: "userId",
          values: userIds,
        });
      }

      // Add queue filters if specified
      if (queueIds && queueIds.length > 0) {
        queryParams.filters[0].predicates.push({
          dimension: "queueId",
          values: queueIds,
        });
      }

      const response = await this.api.post(
        `/api/v2/analytics/conversations/details/query`,
        queryParams
      );

      const callRecords: GenesysCallRecord[] = response.data.results.map(
        (result: any) => ({
          conversationId: result.conversationId,
          startTime: result.startTime,
          endTime: result.endTime,
          duration: Math.round(result.tConversationDuration / 1000), // Convert from milliseconds to seconds
          userId: result.userId,
          queueId: result.queueId,
          direction: result.direction || "inbound",
          mediaType: "voice",
        })
      );

      logger.info("Retrieved call records from Genesys Cloud", {
        count: callRecords.length,
        startDate,
        endDate,
      });

      logGenesysAction("get_call_records", {
        success: true,
        count: callRecords.length,
        startDate,
        endDate,
      });

      return callRecords;
    } catch (error) {
      logger.error("Failed to get call records from Genesys Cloud", {
        error,
        startDate,
        endDate,
      });
      logGenesysAction("get_call_records", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        startDate,
        endDate,
      });
      throw new Error(
        `Failed to get call records: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get users (agents) from Genesys Cloud
   */
  async getUsers(): Promise<GenesysUser[]> {
    if (!this.api) {
      throw new Error("API client not initialized");
    }

    try {
      await this.ensureValidToken();

      const response = await this.api.get("/api/v2/users", {
        params: {
          pageSize: 100,
          pageNumber: 1,
        },
      });

      const users: GenesysUser[] = response.data.entities.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        division: {
          id: user.division.id,
          name: user.division.name,
        },
        department: user.department?.name,
        title: user.title,
      }));

      logger.info("Retrieved users from Genesys Cloud", {
        count: users.length,
      });
      logGenesysAction("get_users", { success: true, count: users.length });

      return users;
    } catch (error) {
      logger.error("Failed to get users from Genesys Cloud", { error });
      logGenesysAction("get_users", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error(
        `Failed to get users: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get queues from Genesys Cloud
   */
  async getQueues(): Promise<GenesysQueue[]> {
    if (!this.api) {
      throw new Error("API client not initialized");
    }

    try {
      await this.ensureValidToken();

      const response = await this.api.get("/api/v2/routing/queues", {
        params: {
          pageSize: 100,
          pageNumber: 1,
        },
      });

      const queues: GenesysQueue[] = response.data.entities.map(
        (queue: any) => ({
          id: queue.id,
          name: queue.name,
          description: queue.description,
          division: {
            id: queue.division.id,
            name: queue.division.name,
          },
        })
      );

      logger.info("Retrieved queues from Genesys Cloud", {
        count: queues.length,
      });
      logGenesysAction("get_queues", { success: true, count: queues.length });

      return queues;
    } catch (error) {
      logger.error("Failed to get queues from Genesys Cloud", { error });
      logGenesysAction("get_queues", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error(
        `Failed to get queues: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get call analytics for a date range
   */
  async getCallAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<GenesysCallAnalytics> {
    try {
      const callRecords = await this.getCallRecords(startDate, endDate);

      const analytics: GenesysCallAnalytics = {
        totalCalls: callRecords.length,
        totalMinutes: Math.round(
          callRecords.reduce((sum, record) => sum + record.duration, 0) / 60
        ),
        averageCallDuration:
          callRecords.length > 0
            ? Math.round(
                callRecords.reduce((sum, record) => sum + record.duration, 0) /
                  callRecords.length /
                  60
              )
            : 0,
        callsByDate: {},
        callsByUser: {},
        callsByQueue: {},
      };

      // Group calls by date
      callRecords.forEach((record) => {
        const date = new Date(record.startTime).toISOString().split("T")[0];
        analytics.callsByDate[date] = (analytics.callsByDate[date] || 0) + 1;
      });

      // Group calls by user
      callRecords.forEach((record) => {
        if (record.userId) {
          analytics.callsByUser[record.userId] =
            (analytics.callsByUser[record.userId] || 0) + 1;
        }
      });

      // Group calls by queue
      callRecords.forEach((record) => {
        if (record.queueId) {
          analytics.callsByQueue[record.queueId] =
            (analytics.callsByQueue[record.queueId] || 0) + 1;
        }
      });

      logger.info("Generated call analytics", {
        totalCalls: analytics.totalCalls,
        totalMinutes: analytics.totalMinutes,
        startDate,
        endDate,
      });

      return analytics;
    } catch (error) {
      logger.error("Failed to generate call analytics", {
        error,
        startDate,
        endDate,
      });
      throw error;
    }
  }

  /**
   * Test connection to Genesys Cloud
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      const users = await this.getUsers();
      return users.length > 0;
    } catch (error) {
      logger.error("Genesys Cloud connection test failed", { error });
      return false;
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    isConnected: boolean;
    hasValidToken: boolean;
    tokenExpiresAt?: Date;
  } {
    return {
      isConnected: !!this.api,
      hasValidToken: !!(
        this.accessToken &&
        this.tokenExpiry &&
        new Date() < this.tokenExpiry
      ),
      tokenExpiresAt: this.tokenExpiry || undefined,
    };
  }
}
