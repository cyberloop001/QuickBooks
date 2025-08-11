import axios, { AxiosInstance } from "axios";
import { getRepository } from "typeorm";
import { Client } from "../entities/Client";
import { logger, logQBOAction } from "../utils/logger";
import { config } from "../config";

export interface QBOToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  expires_at: Date;
}

export interface QBOInvoice {
  Id: string;
  DocNumber: string;
  CustomerRef: { value: string };
  TotalAmt: number;
  Balance: number;
  PrivateNote: string;
  TxnDate: string;
  Line: any[];
}

export class QBOService {
  private api: AxiosInstance;
  private baseUrl: string;
  private token: QBOToken | null = null;

  constructor() {
    this.baseUrl =
      config.qbo.environment === "sandbox"
        ? "https://sandbox-accounts.platform.intuit.com"
        : "https://accounts.platform.intuit.com";

    this.api = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Add request interceptor for authentication
    this.api.interceptors.request.use(async (config) => {
      if (this.token && this.isTokenExpired()) {
        await this.refreshToken();
      }

      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token.access_token}`;
      }

      return config;
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.token) {
          // Token expired, try to refresh
          try {
            await this.refreshToken();
            // Retry the original request
            const originalRequest = error.config;
            originalRequest.headers.Authorization = `Bearer ${
              this.token!.access_token
            }`;
            return this.api.request(originalRequest);
          } catch (refreshError) {
            logger.error("Failed to refresh QBO token", {
              error: refreshError,
            });
            throw error;
          }
        }
        throw error;
      }
    );
  }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: config.qbo.clientId,
      response_type: "code",
      scope: config.qbo.scope,
      redirect_uri: config.qbo.redirectUri,
      state: this.generateState(),
    });

    return `${this.baseUrl}/oauth2/v1/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<QBOToken> {
    try {
      const response = await this.api.post(
        "/oauth2/v1/tokens/bearer",
        {
          grant_type: "authorization_code",
          code,
          redirect_uri: config.qbo.redirectUri,
        },
        {
          auth: {
            username: config.qbo.clientId,
            password: config.qbo.clientSecret,
          },
        }
      );

      const token: QBOToken = {
        ...response.data,
        expires_at: new Date(Date.now() + response.data.expires_in * 1000),
      };

      this.token = token;
      logQBOAction("token_exchange", { success: true });

      return token;
    } catch (error) {
      logger.error("Failed to exchange code for token", { error });
      logQBOAction("token_exchange", { success: false, error: error.message });
      throw new Error(`Failed to exchange code for token: ${error.message}`);
    }
  }

  /**
   * Refresh access token
   */
  private async refreshToken(): Promise<void> {
    if (!this.token?.refresh_token) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await this.api.post(
        "/oauth2/v1/tokens/bearer",
        {
          grant_type: "refresh_token",
          refresh_token: this.token.refresh_token,
        },
        {
          auth: {
            username: config.qbo.clientId,
            password: config.qbo.clientSecret,
          },
        }
      );

      this.token = {
        ...this.token,
        access_token: response.data.access_token,
        expires_in: response.data.expires_in,
        expires_at: new Date(Date.now() + response.data.expires_in * 1000),
      };

      logQBOAction("token_refresh", { success: true });
    } catch (error) {
      logger.error("Failed to refresh token", { error });
      logQBOAction("token_refresh", { success: false, error: error.message });
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(): boolean {
    if (!this.token) return true;

    // Refresh token 5 minutes before expiration
    const bufferTime = 5 * 60 * 1000;
    return this.token.expires_at.getTime() - bufferTime < Date.now();
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
    try {
      // Search for invoices by customer and date range
      const query = `SELECT * FROM Invoice WHERE CustomerRef = '${customerId}' AND TxnDate >= '${
        startDate.toISOString().split("T")[0]
      }' AND TxnDate <= '${endDate.toISOString().split("T")[0]}'`;

      const response = await this.api.get(
        "/v3/company/" + config.qbo.accountId + "/query",
        {
          params: { query },
        }
      );

      const invoices = response.data.QueryResponse.Invoice || [];

      // Check for invoices with matching job ID in PrivateNote
      for (const invoice of invoices) {
        if (invoice.PrivateNote && invoice.PrivateNote.includes(jobId)) {
          logQBOAction("find_existing_invoice", {
            success: true,
            invoiceId: invoice.Id,
            jobId,
          });
          return invoice;
        }
      }

      logQBOAction("find_existing_invoice", {
        success: true,
        found: false,
        customerId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      return null;
    } catch (error) {
      logger.error("Failed to find existing invoice", {
        error,
        customerId,
        startDate,
        endDate,
        jobId,
      });
      logQBOAction("find_existing_invoice", {
        success: false,
        error: error.message,
        customerId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        jobId,
      });
      throw new Error(`Failed to find existing invoice: ${error.message}`);
    }
  }

  /**
   * Create invoice in QBO
   */
  async createInvoice(invoiceData: any): Promise<QBOInvoice> {
    try {
      const response = await this.api.post(
        `/v3/company/${config.qbo.accountId}/invoice`,
        invoiceData
      );

      const invoice = response.data.Invoice;

      logQBOAction("create_invoice", {
        success: true,
        invoiceId: invoice.Id,
        customerId: invoice.CustomerRef.value,
        amount: invoice.TotalAmt,
      });

      return invoice;
    } catch (error) {
      logger.error("Failed to create invoice", { error, invoiceData });
      logQBOAction("create_invoice", {
        success: false,
        error: error.message,
        customerId: invoiceData.CustomerRef?.value,
      });
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<any> {
    try {
      const response = await this.api.get(
        `/v3/company/${config.qbo.accountId}/customer/${customerId}`
      );

      logQBOAction("get_customer", {
        success: true,
        customerId,
      });

      return response.data.Customer;
    } catch (error) {
      logger.error("Failed to get customer", { error, customerId });
      logQBOAction("get_customer", {
        success: false,
        error: error.message,
        customerId,
      });
      throw new Error(`Failed to get customer: ${error.message}`);
    }
  }

  /**
   * Search for customers
   */
  async searchCustomers(query: string): Promise<any[]> {
    try {
      const searchQuery = `SELECT * FROM Customer WHERE DisplayName LIKE '%${query}%' OR PrimaryEmailAddr LIKE '%${query}%'`;

      const response = await this.api.get(
        "/v3/company/" + config.qbo.accountId + "/query",
        {
          params: { query: searchQuery },
        }
      );

      const customers = response.data.QueryResponse.Customer || [];

      logQBOAction("search_customers", {
        success: true,
        query,
        count: customers.length,
      });

      return customers;
    } catch (error) {
      logger.error("Failed to search customers", { error, query });
      logQBOAction("search_customers", {
        success: false,
        error: error.message,
        query,
      });
      throw new Error(`Failed to search customers: ${error.message}`);
    }
  }

  /**
   * Get company info
   */
  async getCompanyInfo(): Promise<any> {
    try {
      const response = await this.api.get(
        `/v3/company/${config.qbo.accountId}/companyinfo/${config.qbo.accountId}`
      );

      logQBOAction("get_company_info", {
        success: true,
      });

      return response.data.CompanyInfo;
    } catch (error) {
      logger.error("Failed to get company info", { error });
      logQBOAction("get_company_info", {
        success: false,
        error: error.message,
      });
      throw new Error(`Failed to get company info: ${error.message}`);
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getCompanyInfo();
      return true;
    } catch (error) {
      logger.error("QBO connection test failed", { error });
      return false;
    }
  }

  /**
   * Generate random state for OAuth
   */
  private generateState(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
