import axios, { AxiosInstance } from "axios";
import OAuthClient from "intuit-oauth";
import { logger, logQBOServiceAction } from "../utils/logger";
import { config } from "../config";

export interface QBOToken {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  realmId: string;
  expires_at: Date;
}

export interface QBOCompanyInfo {
  Id: string;
  CompanyName: string;
  LegalName: string;
  CompanyAddr: any;
  CustomerCommunicationAddr: any;
  WebAddr: any;
  Email: any;
  NameValue: any[];
  SupportedLanguages: string;
  Country: string;
  FiscalYearStartMonth: string;
  LegalAddr: any;
  MetaData: any;
  ReportPrefs: any;
  Preferences: any;
}

export interface QBOInvoice {
  Id: string;
  DocNumber: string;
  TxnDate: string;
  CustomerRef: { value: string };
  Line: any[];
  TotalAmt: number;
  PrivateNote: string;
  MetaData: any;
}

export class QBOService {
  private oauthClient: OAuthClient | null = null;
  private tokens: QBOToken | null = null;
  private api: AxiosInstance | null = null;

  constructor() {
    this.initializeOAuthClient();
  }

  /**
   * Initialize OAuth client
   */
  private initializeOAuthClient(): void {
    try {
      this.oauthClient = new OAuthClient({
        clientId: config.qbo.clientId,
        clientSecret: config.qbo.clientSecret,
        environment: config.qbo.environment as "sandbox" | "production",
        redirectUri: config.qbo.redirectUri,
      });

      logger.info("QBO OAuth client initialized", {
        environment: config.qbo.environment,
        clientId: config.qbo.clientId ? "configured" : "not configured",
      });
    } catch (error) {
      logger.error("Failed to initialize QBO OAuth client", { error });
    }
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(): string {
    if (!this.oauthClient) {
      throw new Error("OAuth client not initialized");
    }

    const authUri = this.oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: "phone-billing-system",
    });

    logQBOServiceAction("get_authorization_url", { success: true });
    return authUri;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(
    callbackUrl: string,
    state: string,
    realmId: string
  ): Promise<QBOToken> {
    if (!this.oauthClient) {
      throw new Error("OAuth client not initialized");
    }

    try {
      const authResponse = await this.oauthClient.createToken(callbackUrl);
      const tokenData = authResponse.getJson();

      this.tokens = {
        ...tokenData,
        realmId: realmId,
        state: state,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
      };

      // Initialize API client with new tokens
      this.initializeAPIClient();
      if (!this.tokens) {
        throw new Error("Failed to create tokens object");
      }
      logQBOServiceAction("handle_callback", { success: true });
      return this.tokens;
    } catch (error) {
      logger.error("Failed to handle OAuth callback", { error });
      logQBOServiceAction("handle_callback", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error(
        `OAuth callback failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<QBOToken> {
    if (!this.oauthClient) {
      throw new Error("OAuth client not initialized");
    }

    try {
      const authResponse = await this.oauthClient.refresh();
      const tokenData = authResponse.getJson();

      this.tokens = {
        ...tokenData,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
      };

      // Update API client with new tokens
      this.initializeAPIClient();

      logQBOServiceAction("refresh_token", { success: true });
      return this.tokens!;
    } catch (error) {
      logger.error("Failed to refresh access token", { error });
      logQBOServiceAction("refresh_token", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error(
        `Token refresh failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Initialize API client with current tokens
   */
  private initializeAPIClient(): void {
    if (!this.tokens) {
      throw new Error("No valid tokens available");
    }

    const baseURL =
      this.oauthClient?.environment === "sandbox"
        ? OAuthClient.environment.sandbox
        : OAuthClient.environment.production;

    this.api = axios.create({
      baseURL: baseURL + `v3/company/${this.tokens.realmId}`,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${this.tokens.access_token}`,
      },
    });

    // Add response interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.tokens?.refresh_token) {
          try {
            await this.refreshAccessToken();
            // Retry the original request with new token
            if (this.api && error.config) {
              error.config.headers.Authorization = `Bearer ${this.tokens?.access_token}`;
              return this.api.request(error.config);
            }
          } catch (refreshError) {
            logger.error("Failed to refresh token during API call", {
              refreshError,
            });
          }
        }
        throw error;
      }
    );
  }

  /**
   * Check if tokens are valid
   */
  isAuthenticated(): boolean {
    if (!this.tokens || !this.api) return false;

    // Check if token is expired (with 5 minute buffer)
    const now = new Date();
    const expiresAt = new Date(
      this.tokens.expires_at.getTime() - 5 * 60 * 1000
    );

    return now < expiresAt;
  }

  /**
   * Get company information
   */
  async getCompanyInfo(): Promise<QBOCompanyInfo> {
    if (!this.api || !this.tokens) {
      throw new Error("Not authenticated with QBO");
    }

    // Validate tokens have required fields
    if (!this.tokens.realmId) {
      logger.error("Missing realmId in tokens", { tokens: this.tokens });
      throw new Error("Invalid tokens: missing realmId");
    }

    try {
      const response = await this.api.get(
        `/companyinfo/${this.tokens.realmId}`
      );
      const companyInfo = response.data;

      logQBOServiceAction("get_company_info", { success: true });
      return companyInfo;
    } catch (error) {
      logger.error("Failed to get company info", { error });
      logQBOServiceAction("get_company_info", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error(
        `Failed to get company info: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Search for customers
   */
  async searchCustomers(query: string): Promise<any[]> {
    if (!this.api || !this.tokens) {
      throw new Error("Not authenticated with QBO");
    }

    try {
      // QBO doesn't support OR operations, so we need to make separate queries
      const queries = [
        `SELECT * FROM Customer WHERE DisplayName LIKE '%${query}%' MAXRESULTS 20`,
        `SELECT * FROM Customer WHERE PrimaryEmailAddr LIKE '%${query}%' MAXRESULTS 20`,
      ];

      const allCustomers: any[] = [];
      const seenIds = new Set<string>();

      for (const queryStr of queries) {
        try {
          const response = await this.api.get(`/query`, {
            params: { query: queryStr },
          });

          const customers = response.data.QueryResponse?.Customer || [];

          // Add customers, avoiding duplicates by ID
          for (const customer of customers) {
            if (!seenIds.has(customer.Id)) {
              seenIds.add(customer.Id);
              allCustomers.push(customer);
            }
          }
        } catch (queryError) {
          logger.warn(`Failed to execute customer query: ${queryStr}`, {
            queryError,
          });
          // Continue with other queries
        }
      }

      // Sort by DisplayName for better user experience
      allCustomers.sort((a, b) =>
        (a.DisplayName || "").localeCompare(b.DisplayName || "")
      );

      // Limit to 20 total results
      const limitedCustomers = allCustomers.slice(0, 20);

      logQBOServiceAction("search_customers", {
        success: true,
        query,
        count: limitedCustomers.length,
        totalFound: allCustomers.length,
      });

      return limitedCustomers;
    } catch (error) {
      logger.error("Failed to search customers", { error, query });
      logQBOServiceAction("search_customers", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        query,
      });
      throw new Error(
        `Failed to search customers: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<any> {
    if (!this.api || !this.tokens) {
      throw new Error("Not authenticated with QBO");
    }

    try {
      const response = await this.api.get(`/customer/${customerId}`);
      const customer = response.data;

      logQBOServiceAction("get_customer", { success: true, customerId });
      return customer;
    } catch (error) {
      logger.error("Failed to get customer", { error, customerId });
      logQBOServiceAction("get_customer", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        customerId,
      });
      throw new Error(
        `Failed to get customer: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Find existing invoice to prevent duplicates
   */
  async findExistingInvoice(
    customerId: string,
    startDate: Date,
    endDate: Date,
    jobId: string
  ): Promise<QBOInvoice | null> {
    if (!this.api || !this.tokens) {
      throw new Error("Not authenticated with QBO");
    }

    try {
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      const response = await this.api.get(`/query`, {
        params: {
          query: `SELECT * FROM Invoice WHERE CustomerRef = '${customerId}' AND TxnDate >= '${startDateStr}' AND TxnDate <= '${endDateStr}' AND PrivateNote LIKE '%${jobId}%' MAXRESULTS 1`,
        },
      });

      const invoices = response.data.QueryResponse?.Invoice || [];
      const existingInvoice = invoices[0] || null;

      logQBOServiceAction("find_existing_invoice", {
        success: true,
        customerId,
        startDate: startDateStr,
        endDate: endDateStr,
        found: !!existingInvoice,
      });

      return existingInvoice;
    } catch (error) {
      logger.error("Failed to find existing invoice", {
        error,
        customerId,
        startDate,
        endDate,
        jobId,
      });
      logQBOServiceAction("find_existing_invoice", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        customerId,
        startDate,
        endDate,
        jobId,
      });
      throw new Error(
        `Failed to find existing invoice: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Create invoice in QBO
   */
  async createInvoice(invoiceData: any): Promise<QBOInvoice> {
    if (!this.api || !this.tokens) {
      throw new Error("Not authenticated with QBO");
    }

    try {
      const response = await this.api.post(`/invoice`, invoiceData);
      const invoice = response.data;

      logQBOServiceAction("create_invoice", {
        success: true,
        invoiceId: invoice.Id,
        docNumber: invoice.DocNumber,
      });
      return invoice;
    } catch (error) {
      logger.error("Failed to create invoice", { error, invoiceData });
      logQBOServiceAction("create_invoice", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        invoiceData,
      });
      throw new Error(
        `Failed to create invoice: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Test connection to QBO
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.isAuthenticated()) {
        return false;
      }

      await this.getCompanyInfo();
      return true;
    } catch (error) {
      logger.error("QBO connection test failed", { error });
      return false;
    }
  }

  /**
   * Get current tokens
   */
  getTokens(): QBOToken | null {
    return this.tokens;
  }

  /**
   * Set tokens (for persistence)
   */
  setTokens(tokens: QBOToken): void {
    this.tokens = tokens;
    this.initializeAPIClient();
  }
}
