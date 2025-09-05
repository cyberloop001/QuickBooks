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
  mediaType: "voice" | "chat" | "email" | "callback";
  wrapUpCode?: string;
  recordingId?: string;
  // New fields for enhanced filtering
  ani?: string;
  flowOutType?: string;
  abandoned?: boolean;
  isTestCall?: boolean;
  isAnsweredCall?: boolean;
  isVoicemail?: boolean;
  totalHandleTime?: number; // in milliseconds
  totalACW?: number; // in milliseconds
  totalActiveCallback?: number; // in milliseconds
  billableMinutes?: number; // calculated AHT in minutes
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
   * Get conversations filtered by queue for queue-based billing with enhanced filtering
   */
  async getQueueBasedBillingData(
    startDate: Date,
    endDate: Date,
    queueName: string
  ): Promise<{
    callRecords: GenesysCallRecord[];
    aggregations: {
      totalHits: number;
      totalCalls: number;
      totalDuration: number;
      totalMinutes: number;
      queueName: string;
      queueId: string;
      totalAnsweredCalls: number;
      totalBillableMinutes: number;
      totalTestCalls: number;
      totalFilteredCalls: number;
    };
  }> {
    if (!this.api) {
      throw new Error("API client not initialized");
    }

    try {
      await this.ensureValidToken();

      const startTime = startDate.toISOString();
      const endTime = endDate.toISOString();

      if (!queueName) {
        throw new Error("Queue name is required");
      }

      const queueId = await this.getQueueId(queueName);

      // Initialize variables for pagination
      let allCallRecords: GenesysCallRecord[] = [];
      let pageNumber = 1;
      const pageSize = 100; // Fetch 100 records per page
      let totalHits = 0;
      let hasMorePages = true;

      logger.info(
        "Starting paginated retrieval of queue-based billing data with enhanced filtering",
        {
          queueName,
          startDate,
          endDate,
          pageSize,
        }
      );

      // Loop through pages until we have all conversations
      while (hasMorePages) {
        // Build the analytics query for queue-based billing with pagination
        const queueBillingQuery = {
          interval: `${startTime}/${endTime}`,
          paging: {
            pageSize,
            pageNumber,
          },
          segmentFilters: [
            {
              type: "and",
              predicates: [
                {
                  dimension: "queueId",
                  value: queueId,
                },
              ],
              clauses: [
                {
                  type: "or",
                  predicates: [
                    { dimension: "mediaType", value: "callback" },
                    { dimension: "mediaType", value: "voice" },
                  ],
                },
              ],
            },
          ],
        };

        const response = await this.api.post(
          `/api/v2/analytics/conversations/details/query`,
          queueBillingQuery
        );

        // Handle the actual API response structure with enhanced filtering
        const conversations = response.data.conversations || [];
        const pageCallRecords: GenesysCallRecord[] = conversations.map(
          (conversation: any) => {
            // Extract conversation-level data
            const conversationStart = conversation.conversationStart;
            const conversationEnd = conversation.conversationEnd;
            const duration = Math.round(
              (new Date(conversationEnd).getTime() -
                new Date(conversationStart).getTime()) /
                1000
            );

            // Initialize record with basic data
            let record: GenesysCallRecord = {
              conversationId: conversation.conversationId,
              startTime: conversationStart,
              endTime: conversationEnd,
              duration: duration,
              queueId,
              queueName,
              mediaType: "voice", // default
              direction: "inbound", // default
              ani: "",
              flowOutType: "",
              abandoned: false,
              isTestCall: false,
              isAnsweredCall: false,
              isVoicemail: false,
              totalHandleTime: 0,
              totalACW: 0,
              totalActiveCallback: 0,
              billableMinutes: 0,
            };

            // Process participants to extract detailed information
            const participants = conversation.participants || [];

            // Find customer participant for ANI and direction
            const customerParticipant = participants.find(
              (p: any) => p.purpose === "customer"
            );
            if (
              customerParticipant &&
              customerParticipant.sessions &&
              customerParticipant.sessions.length > 0
            ) {
              const session = customerParticipant.sessions[0];
              record.ani = session.ani || "";
              // Check for flow-out type
              if (session.flow && session.flow.exitReason) {
                record.flowOutType = session.flow.exitReason.toLowerCase();
              }
            }

            // Find agent participant for handle time and ACW
            const agentParticipant = participants.find(
              (p: any) => p.purpose === "agent"
            );
            if (
              agentParticipant &&
              agentParticipant.sessions &&
              agentParticipant.sessions.length > 0
            ) {
              const session = agentParticipant.sessions[0];
              const metrics = session.metrics || [];

              record.direction = session.direction || "inbound";
              record.mediaType = session.mediaType || "voice";

              if (session.mediaType === "callback") {
                const callbackMetric = metrics.find(
                  (m: any) => m.name === "tActiveCallback"
                );
                record.totalActiveCallback = callbackMetric
                  ? callbackMetric.value
                  : 0;
              }

              // Extract timing metrics
              const handleMetric = metrics.find(
                (m: any) => m.name === "tHandle"
              );
              const acwMetric = metrics.find((m: any) => m.name === "tAcw");
              const answeredMetric = metrics.find(
                (m: any) => m.name === "tAnswered"
              );

              record.totalHandleTime = handleMetric ? handleMetric.value : 0;
              record.totalACW = acwMetric ? acwMetric.value : 0;

              // Call is answered if there's an answered metric
              record.isAnsweredCall = !!answeredMetric;
            }

            // Find voicemail participant
            const voicemailParticipant = participants.find(
              (p: any) => p.purpose === "voicemail"
            );
            record.isVoicemail = !!voicemailParticipant;

            // Apply filtering rules

            // 1. Remove test calls - IF([ANI]="tel:+18887703307",1,0)
            record.isTestCall = record.ani === "tel:+18887703307";

            // 2. Identify answered calls (Inbound Calls)
            // =IF(AND([Media Type]="voice", [Initial Direction]="Inbound", [Flow-Out Type]="customer") , 0 ,
            //    IF (AND([Media Type]="voice", [Abandoned]="NO" ,[Test Call]=0, [Initial Direction]="Inbound"),1,0))
            if (
              record.mediaType === "voice" &&
              record.direction === "inbound" &&
              record.flowOutType === "customer"
            ) {
              record.isAnsweredCall = false; // Flow-out type is customer, not answered
            } else if (
              record.mediaType === "voice" &&
              !record.abandoned &&
              !record.isTestCall &&
              record.direction === "inbound"
            ) {
              record.isAnsweredCall = true;
            } else {
              record.isAnsweredCall = false;
            }

            // 3. Calculate AHT (Average Handle Time) in minutes
            // =IF(AND([Media Type]="voice", [Answered calls]=1), ([Total Handle Time] - [Total ACW])/60,
            //    IF(AND([Media Type]="callback", [Voicemail]="Yes") , [Total Active Callback]/60,
            //       IF([Initial Direction]="outbound", ([Total Handle Time] - [Total ACW])/60, "")))

            if (record.mediaType === "voice" && record.isAnsweredCall) {
              // Voice answered calls: (Handle Time - ACW) / 60 seconds / 1000 ms
              record.billableMinutes =
                ((record.totalHandleTime ?? 0) - (record.totalACW ?? 0)) /
                60000;
            } else if (record.mediaType === "callback" && record.isVoicemail) {
              // Callback voicemails: Total Active Callback / 60 seconds / 1000 ms
              record.billableMinutes =
                (record.totalActiveCallback ?? 0) / 60000;
            } else if (record.direction === "outbound") {
              // Outbound calls: (Handle Time - ACW) / 60 seconds / 1000 ms
              record.billableMinutes =
                ((record.totalHandleTime ?? 0) - (record.totalACW ?? 0)) /
                60000;
            } else {
              record.billableMinutes = 0;
            }

            // Ensure billable minutes is non-negative
            record.billableMinutes = Math.max(0, record.billableMinutes);

            return record;
          }
        );

        // Add page records to total collection
        allCallRecords = allCallRecords.concat(pageCallRecords);

        // Update total hits from first response
        if (pageNumber === 1) {
          totalHits = response.data.totalHits || 0;
        }

        // Check if we have more pages
        hasMorePages =
          allCallRecords.length < totalHits &&
          conversations.length === pageSize;

        logger.info(
          `Retrieved page ${pageNumber} of queue-based billing data`,
          {
            pageNumber,
            pageSize,
            recordsInPage: conversations.length,
            totalRecordsSoFar: allCallRecords.length,
            totalHits,
            hasMorePages,
          }
        );

        // Increment page number for next iteration
        pageNumber++;

        // Add a small delay to avoid overwhelming the API
        if (hasMorePages) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Filter out test calls for final calculations
      const filteredCallRecords = allCallRecords.filter(
        (record) => !record.isTestCall
      );

      // Calculate aggregations
      const totalCalls = allCallRecords.length;
      const totalFilteredCalls = filteredCallRecords.length;
      const totalTestCalls = totalCalls - totalFilteredCalls;
      const totalAnsweredCalls = filteredCallRecords.filter(
        (record) => record.isAnsweredCall
      ).length;

      // Calculate total billable minutes (sum of all AHT calculations)
      const totalBillableMinutes = filteredCallRecords.reduce(
        (sum, record) => sum + (record.billableMinutes || 0),
        0
      );

      const totalDuration = filteredCallRecords.reduce(
        (sum, record) => sum + record.duration,
        0
      );
      const totalMinutes = Math.round((totalDuration / 60) * 100) / 100;

      logger.info(
        "Completed paginated retrieval of queue-based billing data with enhanced filtering",
        {
          totalPages: pageNumber - 1,
          totalRecords: totalCalls,
          totalFilteredRecords: totalFilteredCalls,
          totalTestCalls,
          totalAnsweredCalls,
          totalBillableMinutes: Math.round(totalBillableMinutes * 100) / 100,
          totalHits,
          startDate,
          endDate,
          queueName,
        }
      );

      return {
        callRecords: filteredCallRecords, // Return only non-test calls
        aggregations: {
          totalCalls,
          queueName,
          queueId,
          totalFilteredCalls,
          totalTestCalls,
          totalAnsweredCalls,
          totalHits,
          totalDuration,
          totalMinutes,
          totalBillableMinutes: Math.round(totalBillableMinutes * 100) / 100,
        },
      };
    } catch (error) {
      logger.error(
        "Failed to get queue-based billing data from Genesys Cloud",
        {
          error,
          startDate,
          endDate,
          queueName,
        }
      );
      throw error;
    }
  }

  /**
   * Get queue ID by queue name
   */
  async getQueueId(queueName: string): Promise<string> {
    try {
      if (!this.api) {
        throw new Error("API client not initialized");
      }

      await this.ensureValidToken();

      const response = await this.api.get("/api/v2/routing/queues", {
        params: {
          name: queueName,
        },
      });

      const queues = response.data.entities || [];
      if (queues.length === 0) {
        throw new Error(`Queue not found: ${queueName}`);
      }

      return queues[0].id;
    } catch (error) {
      logger.error(`Failed to get queue ID for queue: ${queueName}`, { error });
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
