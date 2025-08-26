import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("qbo_tokens")
@Index(["realmId"], { unique: true })
export class QBOToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  realmId!: string;

  @Column({ type: "text" })
  accessToken!: string;

  @Column({ type: "text" })
  refreshToken!: string;

  @Column({ type: "text" })
  tokenType!: string;

  @Column({ type: "int" })
  expiresIn!: number;

  @Column({ type: "int" })
  xRefreshTokenExpiresIn!: number;

  @Column({ type: "timestamp" })
  expiresAt!: Date;

  @Column({ type: "text", nullable: true })
  state?: string;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods
  isExpired(): boolean {
    const now = new Date();
    // Add 5 minute buffer for safety
    const bufferTime = new Date(this.expiresAt.getTime() - 5 * 60 * 1000);
    return now >= bufferTime;
  }

  needsRefresh(): boolean {
    const now = new Date();
    // Check if token expires within 10 minutes
    const refreshTime = new Date(this.expiresAt.getTime() - 10 * 60 * 1000);
    return now >= refreshTime;
  }

  toQBOTokenInterface(): {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    x_refresh_token_expires_in: number;
    realmId: string;
    expires_at: Date;
    state?: string;
  } {
    return {
      access_token: this.accessToken,
      refresh_token: this.refreshToken,
      token_type: this.tokenType,
      expires_in: this.expiresIn,
      x_refresh_token_expires_in: this.xRefreshTokenExpiresIn,
      realmId: this.realmId,
      expires_at: this.expiresAt,
      state: this.state,
    };
  }

  static fromQBOTokenInterface(
    tokenData: any,
    realmId: string,
    state?: string
  ): QBOToken {
    const token = new QBOToken();
    token.realmId = realmId;
    token.accessToken = tokenData.access_token;
    token.refreshToken = tokenData.refresh_token;
    token.tokenType = tokenData.token_type;
    token.expiresIn = tokenData.expires_in;
    token.xRefreshTokenExpiresIn = tokenData.x_refresh_token_expires_in;
    token.expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    token.state = state;
    token.isActive = true;
    return token;
  }
}
