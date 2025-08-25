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
  queueName?: string;
  customerId?: string;
  phoneNumber?: string;
  direction: "inbound" | "outbound";
  purpose?: string;
  outcome?: string;
  mediaType: "voice" | "chat" | "email";
  wrapUpCode?: string;
  recordingId?: string;
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
   * Get call detail records (CDRs) for a date range using the Analytics API
   */
  async getCallRecords(
    startDate: Date,
    endDate: Date,
    page: number = 1,
    limit: number = 25,
    userIds?: string[],
    queueIds?: string[],
    filters?: any
  ): Promise<{
    callRecords: GenesysCallRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    if (!this.api) {
      throw new Error("API client not initialized");
    }

    try {
      await this.ensureValidToken();

      const startTime = startDate.toISOString();
      const endTime = endDate.toISOString();

      // Build the analytics query based on the new API structure
      const analyticsQuery: any = {
        interval: `${startTime}/${endTime}`,
        segmentFilters: [
          {
            type: "or",
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
        analyticsQuery.segmentFilters[0].predicates.push({
          dimension: "userId",
          values: userIds,
        });
      }

      // Add queue filters if specified
      if (queueIds && queueIds.length > 0) {
        analyticsQuery.segmentFilters[0].predicates.push({
          dimension: "queueId",
          values: queueIds,
        });
      }

      // Add custom filters if provided
      if (filters) {
        analyticsQuery.segmentFilters.push(filters);
      }

      // Add pagination
      analyticsQuery.pageSize = limit;
      analyticsQuery.pageNumber = page;

      const response = await this.api.post(
        `/api/v2/analytics/conversations/details/query`,
        analyticsQuery
      );

      // Handle the actual API response structure
      const conversations = response.data.conversations || [];
      const callRecords: GenesysCallRecord[] = conversations.map(
        (conversation: any) => {
          console.log(conversation);
          // Extract user and queue info from participants
          const participants = conversation.participants || [];
          const agentParticipant = participants.find(
            (p: any) => p.purpose === "agent"
          );
          const userId = agentParticipant?.userId;
          const queueId = agentParticipant?.queueId;

          return {
            conversationId: conversation.conversationId,
            startTime: conversation.conversationStart,
            endTime: conversation.conversationEnd,
            duration: Math.round(
              (new Date(conversation.conversationEnd).getTime() -
                new Date(conversation.conversationStart).getTime()) /
                1000
            ),
            userId,
            queueId,
            direction: conversation.originatingDirection,
            mediaType: conversation.mediaType,
            wrapUpCode: conversation.wrapUpCode,
            recordingId: conversation.recordingId,
          };
        }
      );

      // Get total hits from response (approximate total)
      const totalHits = response.data.totalHits || 0;
      const totalPages = Math.ceil(totalHits / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedCallRecords = callRecords.slice(startIndex, endIndex);

      logger.info("Retrieved call records from Genesys Cloud Analytics API", {
        count: paginatedCallRecords.length,
        totalHits,
        page,
        limit,
        startDate,
        endDate,
      });

      logGenesysAction("get_call_records", {
        success: true,
        count: paginatedCallRecords.length,
        totalHits,
        page,
        limit,
        startDate,
        endDate,
      });

      return {
        callRecords: paginatedCallRecords,
        pagination: {
          page,
          limit,
          total: totalHits,
          pages: totalPages,
        },
      };
    } catch (error) {
      logger.error(
        "Failed to get call records from Genesys Cloud Analytics API",
        {
          error,
          startDate,
          endDate,
          page,
          limit,
        }
      );

      logGenesysAction("get_call_records", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        startDate,
        endDate,
        page,
        limit,
      });

      throw new Error(
        `Failed to get call records: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get users from Genesys Cloud with pagination
   */
  async getUsers(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    users: GenesysUser[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    if (!this.api) {
      throw new Error("API client not initialized");
    }

    try {
      await this.ensureValidToken();

      // First, get total count by fetching all users (Genesys doesn't provide total count in a single request)
      const allUsersResponse = await this.api.get("/api/v2/users", {
        params: {
          pageSize: 1000, // Large page size to get all users for counting
          pageNumber: 1,
        },
      });

      const allUsers: GenesysUser[] = allUsersResponse.data.entities.map(
        (user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          division: {
            id: user.division.id,
            name: user.division.name,
          },
          department: user.department?.name,
          title: user.title,
        })
      );

      const total = allUsers.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUsers = allUsers.slice(startIndex, endIndex);

      logger.info("Retrieved users from Genesys Cloud", {
        count: paginatedUsers.length,
        total,
        page,
        limit,
      });
      logGenesysAction("get_users", {
        success: true,
        count: paginatedUsers.length,
        total,
        page,
        limit,
      });

      return {
        users: paginatedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
        },
      };
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
   * Get queues from Genesys Cloud with pagination
   */
  async getQueues(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    queues: GenesysQueue[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    if (!this.api) {
      throw new Error("API client not initialized");
    }

    try {
      await this.ensureValidToken();

      // First, get total count by fetching all queues (Genesys doesn't provide total count in a single request)
      const allQueuesResponse = await this.api.get("/api/v2/routing/queues", {
        params: {
          pageSize: 1000, // Large page size to get all queues for counting
          pageNumber: 1,
        },
      });

      const allQueues: GenesysQueue[] = allQueuesResponse.data.entities.map(
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

      const total = allQueues.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedQueues = allQueues.slice(startIndex, endIndex);

      logger.info("Retrieved queues from Genesys Cloud", {
        count: paginatedQueues.length,
        total,
        page,
        limit,
      });
      logGenesysAction("get_queues", {
        success: true,
        count: paginatedQueues.length,
        total,
        page,
        limit,
      });

      return {
        queues: paginatedQueues,
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
        },
      };
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
      const result = await this.getCallRecords(startDate, endDate, 1, 1000); // Get up to 1000 records for analytics
      const callRecords = result.callRecords;

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
   * Get aggregated call data for billing purposes
   */
  async getBillingCallData(
    startDate: Date,
    endDate: Date,
    clientIds?: string[]
  ): Promise<{
    callRecords: GenesysCallRecord[];
    aggregations: {
      byClient: Record<
        string,
        { calls: number; totalDuration: number; totalMinutes: number }
      >;
      byWrapUpCode: Record<string, number>;
      totalCalls: number;
      totalDuration: number;
      totalMinutes: number;
    };
  }> {
    if (!this.api) {
      throw new Error("API client not initialized");
    }

    try {
      await this.ensureValidToken();

      const startTime = startDate.toISOString();
      const endTime = endDate.toISOString();

      // Build the analytics query optimized for billing
      const billingQuery: any = {
        interval: `${startTime}/${endTime}`,
        segmentFilters: [
          {
            type: "and",
            predicates: [
              {
                dimension: "mediaType",
                value: "voice",
              },
              {
                dimension: "purpose",
                value: "agent",
              },
            ],
          },
        ],
        aggregations: [
          {
            type: "termFrequency",
            dimension: "userId",
            size: 1000,
          },
          {
            type: "termFrequency",
            dimension: "wrapUpCode",
            size: 100,
          },
          {
            type: "numericRange",
            dimension: "tSegmentDuration",
            ranges: [
              { gt: 0, lte: 30000 }, // 0-30 seconds
              { gt: 30000, lte: 60000 }, // 30-60 seconds
              { gt: 60000, lte: 300000 }, // 1-5 minutes
              { gt: 300000 }, // 5+ minutes
            ],
          },
        ],
        pageSize: 1000, // Large page size for billing data
        pageNumber: 1,
      };

      // Add client filters if specified
      if (clientIds && clientIds.length > 0) {
        billingQuery.segmentFilters[0].predicates.push({
          dimension: "userId",
          values: clientIds,
        });
      }

      const response = await this.api.post(
        `/api/v2/analytics/conversations/details/query`,
        billingQuery
      );

      // Handle the actual API response structure
      const conversations = response.data.conversations || [];
      const callRecords: GenesysCallRecord[] = conversations.map(
        (conversation: any) => {
          // Extract user and queue info from participants
          const participants = conversation.participants || [];
          const agentParticipant = participants.find(
            (p: any) => p.purpose === "agent"
          );
          const userId = agentParticipant?.userId;
          const queueId = agentParticipant?.queueId;

          return {
            conversationId: conversation.conversationId,
            startTime: conversation.conversationStart,
            endTime: conversation.conversationEnd,
            duration: Math.round(
              (new Date(conversation.conversationEnd).getTime() -
                new Date(conversation.conversationStart).getTime()) /
                1000
            ),
            userId,
            queueId,
            direction: conversation.originatingDirection || "inbound",
            mediaType: "voice",
            wrapUpCode: conversation.wrapUpCode,
            recordingId: conversation.recordingId,
          };
        }
      );

      // Process aggregations for billing
      const aggregations = response.data.aggregations || [];
      const byClient: Record<
        string,
        { calls: number; totalDuration: number; totalMinutes: number }
      > = {};
      const byWrapUpCode: Record<string, number> = {};

      // Process wrap-up code aggregations
      const wrapUpAgg = aggregations.find(
        (agg: any) => agg.dimension === "wrapUpCode"
      );
      if (wrapUpAgg && wrapUpAgg.results) {
        wrapUpAgg.results.forEach((result: any) => {
          byWrapUpCode[result.value] = result.count;
        });
      }

      // Group by client (userId) from the actual call records
      callRecords.forEach((record) => {
        if (record.userId) {
          if (!byClient[record.userId]) {
            byClient[record.userId] = {
              calls: 0,
              totalDuration: 0,
              totalMinutes: 0,
            };
          }
          byClient[record.userId].calls++;
          byClient[record.userId].totalDuration += record.duration;
          byClient[record.userId].totalMinutes += record.duration / 60;
        }
      });

      // Round minutes to 2 decimal places
      Object.values(byClient).forEach((clientData) => {
        clientData.totalMinutes =
          Math.round(clientData.totalMinutes * 100) / 100;
      });

      const totalCalls = callRecords.length;
      const totalDuration = callRecords.reduce(
        (sum, record) => sum + record.duration,
        0
      );
      const totalMinutes = Math.round((totalDuration / 60) * 100) / 100;

      logger.info(
        "Retrieved billing call data from Genesys Cloud Analytics API",
        {
          count: callRecords.length,
          totalHits: response.data.totalHits || 0,
          clientsCount: Object.keys(byClient).length,
          startDate,
          endDate,
        }
      );

      logGenesysAction("get_billing_call_data", {
        success: true,
        count: callRecords.length,
        clientsCount: Object.keys(byClient).length,
        startDate,
        endDate,
      });

      return {
        callRecords,
        aggregations: {
          byClient,
          byWrapUpCode,
          totalCalls,
          totalDuration,
          totalMinutes,
        },
      };
    } catch (error) {
      logger.error("Failed to get billing call data from Genesys Cloud", {
        error,
        startDate,
        endDate,
      });
      throw error;
    }
  }

  /**
   * Get conversations filtered by queue for queue-based billing
   */
  async getQueueBasedBillingData(
    startDate: Date,
    endDate: Date,
    queueNames?: string[]
  ): Promise<{
    callRecords: GenesysCallRecord[];
    aggregations: {
      byQueue: Record<
        string,
        { calls: number; totalDuration: number; totalMinutes: number }
      >;
      byWrapUpCode: Record<string, number>;
      totalCalls: number;
      totalDuration: number;
      totalMinutes: number;
    };
  }> {
    if (!this.api) {
      throw new Error("API client not initialized");
    }

    try {
      await this.ensureValidToken();

      const startTime = startDate.toISOString();
      const endTime = endDate.toISOString();

      // Build the analytics query for queue-based billing
      const queueBillingQuery: any = {
        interval: `${startTime}/${endTime}`,
        paging: {
          pageSize: 1000,
          pageNumber: 1,
        },
        segmentFilters: [
          {
            type: "and",
            predicates: [
              {
                dimension: "queueName",
                value:
                  queueNames && queueNames.length > 0
                    ? queueNames[0]
                    : "Support Queue",
              },
              {
                type: "or",
                predicates: [
                  {
                    dimension: "mediaType",
                    value: "voice",
                  },
                  {
                    dimension: "mediaType",
                    value: "callback",
                  },
                ],
              },
            ],
          },
        ],
        aggregations: [
          {
            type: "termFrequency",
            dimension: "queueName",
            size: 100,
          },
          {
            type: "termFrequency",
            dimension: "wrapUpCode",
            size: 100,
          },
          {
            type: "numericRange",
            dimension: "tSegmentDuration",
            ranges: [
              { gt: 0, lte: 30000 }, // 0-30 seconds
              { gt: 30000, lte: 60000 }, // 30-60 seconds
              { gt: 60000, lte: 300000 }, // 1-5 minutes
              { gt: 300000 }, // 5+ minutes
            ],
          },
        ],
      };

      // Add queue filters if specified
      if (queueNames && queueNames.length > 0) {
        if (queueNames.length === 1) {
          // Single queue - use exact match
          queueBillingQuery.segmentFilters[0].predicates[0].value =
            queueNames[0];
        } else {
          // Multiple queues - use OR condition
          queueBillingQuery.segmentFilters[0].predicates[0] = {
            type: "or",
            predicates: queueNames.map((queueName) => ({
              dimension: "queueName",
              value: queueName,
            })),
          };
        }
      }

      const response = await this.api.post(
        `/api/v2/analytics/conversations/details/query`,
        queueBillingQuery
      );

      // Handle the actual API response structure
      const conversations = response.data.conversations || [];
      const callRecords: GenesysCallRecord[] = conversations.map(
        (conversation: any) => {
          // Extract queue info from participants
          const participants = conversation.participants || [];
          const agentParticipant = participants.find(
            (p: any) => p.purpose === "agent"
          );
          const userId = agentParticipant?.userId;
          const queueId = agentParticipant?.queueId;
          const queueName = agentParticipant?.queueName;

          return {
            conversationId: conversation.conversationId,
            startTime: conversation.conversationStart,
            endTime: conversation.conversationEnd,
            duration: Math.round(
              (new Date(conversation.conversationEnd).getTime() -
                new Date(conversation.conversationStart).getTime()) /
                1000
            ),
            userId,
            queueId,
            queueName,
            direction: conversation.originatingDirection || "inbound",
            mediaType: "voice",
            wrapUpCode: conversation.wrapUpCode,
            recordingId: conversation.recordingId,
          };
        }
      );

      // Process aggregations for queue-based billing
      const aggregations = response.data.aggregations || [];
      const byQueue: Record<
        string,
        { calls: number; totalDuration: number; totalMinutes: number }
      > = {};
      const byWrapUpCode: Record<string, number> = {};

      // Process wrap-up code aggregations
      const wrapUpAgg = aggregations.find(
        (agg: any) => agg.dimension === "wrapUpCode"
      );
      if (wrapUpAgg && wrapUpAgg.results) {
        wrapUpAgg.results.forEach((result: any) => {
          byWrapUpCode[result.value] = result.count;
        });
      }

      // Group by queue from the actual call records
      callRecords.forEach((record) => {
        const queueName = record.queueName || "Unknown Queue";
        if (!byQueue[queueName]) {
          byQueue[queueName] = {
            calls: 0,
            totalDuration: 0,
            totalMinutes: 0,
          };
        }
        byQueue[queueName].calls++;
        byQueue[queueName].totalDuration += record.duration;
        byQueue[queueName].totalMinutes += record.duration / 60;
      });

      // Round minutes to 2 decimal places
      Object.values(byQueue).forEach((queueData) => {
        queueData.totalMinutes = Math.round(queueData.totalMinutes * 100) / 100;
      });

      const totalCalls = callRecords.length;
      const totalDuration = callRecords.reduce(
        (sum, record) => sum + record.duration,
        0
      );
      const totalMinutes = Math.round((totalDuration / 60) * 100) / 100;

      logger.info(
        "Retrieved queue-based billing data from Genesys Cloud Analytics API",
        {
          count: callRecords.length,
          totalHits: response.data.totalHits || 0,
          queuesCount: Object.keys(byQueue).length,
          startDate,
          endDate,
        }
      );

      return {
        callRecords,
        aggregations: {
          byQueue,
          byWrapUpCode,
          totalCalls,
          totalDuration,
          totalMinutes,
        },
      };
    } catch (error) {
      logger.error(
        "Failed to get queue-based billing data from Genesys Cloud",
        {
          error,
          startDate,
          endDate,
        }
      );
      throw error;
    }
  }

  /**
   * Test connection to Genesys Cloud
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      const result = await this.getUsers(1, 1); // Just get 1 user to test connection
      return result.users.length > 0;
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
