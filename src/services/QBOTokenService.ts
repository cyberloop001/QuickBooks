import { getRepository, Repository } from "typeorm";
import { QBOToken } from "../entities/QBOToken";
import { logger } from "../utils/logger";

export class QBOTokenService {
  private get tokenRepository(): Repository<QBOToken> {
    return getRepository(QBOToken);
  }

  /**
   * Save or update QBO tokens
   */
  async saveTokens(
    tokenData: any,
    realmId: string,
    state?: string
  ): Promise<QBOToken> {
    try {
      // Check if tokens already exist for this realm
      const existingToken = await this.tokenRepository.findOne({
        where: { realmId, isActive: true },
      });

      if (existingToken) {
        // Update existing token
        existingToken.accessToken = tokenData.access_token;
        existingToken.refreshToken = tokenData.refresh_token;
        existingToken.tokenType = tokenData.token_type;
        existingToken.expiresIn = tokenData.expires_in;
        existingToken.xRefreshTokenExpiresIn =
          tokenData.x_refresh_token_expires_in;
        existingToken.expiresAt = new Date(
          Date.now() + tokenData.expires_in * 1000
        );
        existingToken.state = state;
        existingToken.isActive = true;

        const updatedToken = await this.tokenRepository.save(existingToken);
        logger.info("Updated existing QBO tokens", { realmId });
        return updatedToken;
      } else {
        // Create new token
        const newToken = QBOToken.fromQBOTokenInterface(
          tokenData,
          realmId,
          state
        );
        const savedToken = await this.tokenRepository.save(newToken);
        logger.info("Created new QBO tokens", { realmId });
        return savedToken;
      }
    } catch (error) {
      logger.error("Failed to save QBO tokens", { error, realmId });
      throw error;
    }
  }

  /**
   * Get active tokens for a realm
   */
  async getActiveTokens(realmId: string): Promise<QBOToken | null> {
    try {
      const token = await this.tokenRepository.findOne({
        where: { realmId, isActive: true },
      });

      if (!token) {
        return null;
      }

      // Check if token is expired
      if (token.isExpired()) {
        logger.info("QBO token is expired, marking as inactive", { realmId });
        token.isActive = false;
        await this.tokenRepository.save(token);
        return null;
      }

      return token;
    } catch (error) {
      logger.error("Failed to get active QBO tokens", { error, realmId });
      throw error;
    }
  }

  /**
   * Get all active tokens
   */
  async getAllActiveTokens(): Promise<QBOToken[]> {
    try {
      const tokens = await this.tokenRepository.find({
        where: { isActive: true },
      });

      // Filter out expired tokens
      const validTokens = tokens.filter((token) => !token.isExpired());

      // Mark expired tokens as inactive
      const expiredTokens = tokens.filter((token) => token.isExpired());
      if (expiredTokens.length > 0) {
        for (const token of expiredTokens) {
          token.isActive = false;
          await this.tokenRepository.save(token);
        }
        logger.info(
          `Marked ${expiredTokens.length} expired QBO tokens as inactive`
        );
      }

      return validTokens;
    } catch (error) {
      logger.error("Failed to get all active QBO tokens", { error });
      throw error;
    }
  }

  /**
   * Update tokens (e.g., after refresh)
   */
  async updateTokens(
    realmId: string,
    tokenData: any,
    state?: string
  ): Promise<QBOToken> {
    try {
      const existingToken = await this.tokenRepository.findOne({
        where: { realmId, isActive: true },
      });

      if (!existingToken) {
        throw new Error(`No active tokens found for realm: ${realmId}`);
      }

      // Update token data
      existingToken.accessToken = tokenData.access_token;
      existingToken.refreshToken = tokenData.refresh_token;
      existingToken.tokenType = tokenData.token_type;
      existingToken.expiresIn = tokenData.expires_in;
      existingToken.xRefreshTokenExpiresIn =
        tokenData.x_refresh_token_expires_in;
      existingToken.expiresAt = new Date(
        Date.now() + tokenData.expires_in * 1000
      );
      existingToken.state = state;

      const updatedToken = await this.tokenRepository.save(existingToken);
      logger.info("Updated QBO tokens after refresh", { realmId });
      return updatedToken;
    } catch (error) {
      logger.error("Failed to update QBO tokens", { error, realmId });
      throw error;
    }
  }

  /**
   * Deactivate tokens for a realm
   */
  async deactivateTokens(realmId: string): Promise<void> {
    try {
      const token = await this.tokenRepository.findOne({
        where: { realmId, isActive: true },
      });

      if (token) {
        token.isActive = false;
        await this.tokenRepository.save(token);
        logger.info("Deactivated QBO tokens", { realmId });
      }
    } catch (error) {
      logger.error("Failed to deactivate QBO tokens", { error, realmId });
      throw error;
    }
  }

  /**
   * Delete tokens for a realm
   */
  async deleteTokens(realmId: string): Promise<void> {
    try {
      await this.tokenRepository.delete({ realmId });
      logger.info("Deleted QBO tokens", { realmId });
    } catch (error) {
      logger.error("Failed to delete QBO tokens", { error, realmId });
      throw error;
    }
  }

  /**
   * Check if tokens exist and are valid for a realm
   */
  async hasValidTokens(realmId: string): Promise<boolean> {
    try {
      const token = await this.getActiveTokens(realmId);
      return token !== null && !token.isExpired();
    } catch (error) {
      logger.error("Failed to check token validity", { error, realmId });
      return false;
    }
  }

  /**
   * Get token statistics
   */
  async getTokenStats(): Promise<{
    totalTokens: number;
    activeTokens: number;
    expiredTokens: number;
    realms: string[];
  }> {
    try {
      const allTokens = await this.tokenRepository.find();
      const activeTokens = allTokens.filter(
        (token) => token.isActive && !token.isExpired()
      );
      const expiredTokens = allTokens.filter((token) => token.isExpired());
      const realms = [...new Set(allTokens.map((token) => token.realmId))];

      return {
        totalTokens: allTokens.length,
        activeTokens: activeTokens.length,
        expiredTokens: expiredTokens.length,
        realms,
      };
    } catch (error) {
      logger.error("Failed to get token statistics", { error });
      throw error;
    }
  }
}
