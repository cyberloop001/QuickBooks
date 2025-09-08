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
  CustomerCommunicationEmailAddr?: any;
  WebAddr: any;
  Email: any;
  PrimaryPhone?: any;
  NameValue: any[];
  SupportedLanguages: string;
  Country: string;
  FiscalYearStartMonth: string;
  LegalAddr: any;
  MetaData: any;
  ReportPrefs: any;
  Preferences: any;
  DefaultTimeZone?: string;
  CompanyStartDate?: string;
  domain?: string;
  sparse?: boolean;
  time?: string;
  success?: boolean;
  SyncToken?: string;
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

export interface QBOPayment {
  Id: string;
  TotalAmt: number;
  CustomerRef: { value: string };
  TxnDate: string;
  PrivateNote?: string;
  Line: QBOPaymentLine[];
  PaymentMethodRef?: { value: string };
  DepositToAccountRef?: { value: string };
  MetaData: any;
}

export interface QBOPaymentLine {
  Amount: number;
  LinkedTxn: Array<{
    TxnId: string;
    TxnType: string;
  }>;
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

    if (!this.tokens?.refresh_token) {
      throw new Error("No refresh token available");
    }

    try {
      logger.info("Refreshing QBO access token...");

      const authResponse = await this.oauthClient.refresh();
      const tokenData = authResponse.getJson();

      // Preserve the realmId from existing tokens
      const newTokens: QBOToken = {
        ...tokenData,
        realmId: this.tokens.realmId,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
      };

      this.tokens = newTokens;

      // Update API client with new tokens
      this.initializeAPIClient();

      logger.info("QBO access token refreshed successfully", {
        expiresAt: newTokens.expires_at,
        expiresIn: tokenData.expires_in,
      });

      logQBOServiceAction("refresh_token", { success: true });
      return newTokens;
    } catch (error) {
      logger.error("Failed to refresh access token", { error });
      logQBOServiceAction("refresh_token", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Clear invalid tokens
      this.tokens = null;
      this.api = null;

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
   * Check if tokens need refreshing
   */
  needsTokenRefresh(): boolean {
    if (!this.tokens) return false;

    // Check if token expires within 10 minutes
    const now = new Date();
    const expiresAt = new Date(
      this.tokens.expires_at.getTime() - 10 * 60 * 1000
    );

    return now >= expiresAt;
  }

  /**
   * Ensure valid tokens (refresh if needed)
   */
  async ensureValidTokens(): Promise<boolean> {
    if (!this.tokens) return false;

    if (this.needsTokenRefresh()) {
      try {
        await this.refreshAccessToken();
        return true;
      } catch (error) {
        logger.error("Failed to refresh tokens in ensureValidTokens", {
          error,
        });
        return false;
      }
    }

    return this.isAuthenticated();
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
   * Search for customer by exact display name
   */
  async searchCustomerByDisplayName(displayName: string): Promise<any | null> {
    if (!this.api || !this.tokens) {
      throw new Error("Not authenticated with QBO");
    }

    try {
      const query = `SELECT * FROM Customer WHERE DisplayName = '${displayName}' MAXRESULTS 1`;

      const response = await this.api.get(`/query`, {
        params: { query },
      });

      const customers = response.data.QueryResponse?.Customer || [];
      const customer = customers[0] || null;

      if (customer) {
        logQBOServiceAction("search_customer_by_display_name", {
          success: true,
          displayName,
          customerId: customer.Id,
        });
      } else {
        logQBOServiceAction("search_customer_by_display_name", {
          success: true,
          displayName,
          customerFound: false,
        });
      }

      return customer;
    } catch (error) {
      logger.error("Failed to search customer by display name", {
        error,
        displayName,
      });
      logQBOServiceAction("search_customer_by_display_name", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        displayName,
      });
      throw new Error(
        `Failed to search customer by display name: ${
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
        invoiceId: invoice.Invoice.Id,
        docNumber: invoice.Invoice.DocNumber,
      });
      return invoice.Invoice;
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
   * Create a payment for an invoice in QBO
   */
  async createPayment(paymentData: {
    invoiceId: string;
    customerId: string;
    amount: number;
    privateNote?: string;
  }): Promise<QBOPayment> {
    if (!this.api || !this.tokens) {
      throw new Error("Not authenticated with QBO");
    }

    try {
      const payment = {
        CustomerRef: { value: paymentData.customerId },
        TotalAmt: paymentData.amount,
        PrivateNote: paymentData.privateNote || "Automatic payment for invoice",
        Line: [
          {
            Amount: paymentData.amount,
            LinkedTxn: [
              {
                TxnId: paymentData.invoiceId,
                TxnType: "Invoice",
              },
            ],
          },
        ],
      };

      const response = await this.api.post("/payment", payment);
      const createdPayment = response.data;

      logger.info("Successfully created payment in QBO", {
        paymentId: createdPayment.Id,
        invoiceId: paymentData.invoiceId,
        customerId: paymentData.customerId,
        amount: paymentData.amount,
      });

      logQBOServiceAction("create_payment", {
        success: true,
        paymentId: createdPayment.Id,
        invoiceId: paymentData.invoiceId,
        amount: paymentData.amount,
      });

      return createdPayment;
    } catch (error) {
      logger.error("Failed to create payment", { error, paymentData });
      logQBOServiceAction("create_payment", {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        paymentData,
      });
      throw new Error(
        `Failed to create payment: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Create payment for invoice automatically using default settings
   */
  async createAutomaticPayment(
    invoiceId: string,
    customerId: string,
    amount: number,
    privateNote?: string
  ): Promise<QBOPayment> {
    try {

      return await this.createPayment({
        invoiceId,
        customerId,
        amount,
        privateNote:
          privateNote || "Automatic payment processed by billing system",
      });
    } catch (error) {
      logger.error("Failed to create automatic payment", {
        error,
        invoiceId,
        customerId,
        amount,
      });
      throw error;
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

  /**
   * Get token status information
   */
  getTokenStatus(): {
    hasTokens: boolean;
    isAuthenticated: boolean;
    needsRefresh: boolean;
    expiresAt?: Date;
    expiresIn?: string;
  } {
    if (!this.tokens) {
      return {
        hasTokens: false,
        isAuthenticated: false,
        needsRefresh: false,
      };
    }

    const now = new Date();
    const expiresIn = this.tokens.expires_at.getTime() - now.getTime();
    const expiresInMinutes = Math.max(0, Math.floor(expiresIn / (1000 * 60)));

    return {
      hasTokens: true,
      isAuthenticated: this.isAuthenticated(),
      needsRefresh: this.needsTokenRefresh(),
      expiresAt: this.tokens.expires_at,
      expiresIn: `${expiresInMinutes} minutes`,
    };
  }
}
