import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Client } from "./Client";
import { PhoneUsage } from "./PhoneUsage";

export enum BillingJobStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum BillingJobType {
  MONTHLY = "monthly",
  MANUAL = "manual",
  DRY_RUN = "dry_run",
}

@Entity("billing_jobs")
export class BillingJob {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  jobId!: string;

  @Column({ type: "enum", enum: BillingJobType })
  type!: BillingJobType;

  @Column({
    type: "enum",
    enum: BillingJobStatus,
    default: BillingJobStatus.PENDING,
  })
  status!: BillingJobStatus;

  @Column({ nullable: true })
  clientId!: string;

  @Column({ type: "date" })
  billingPeriodStart!: Date;

  @Column({ type: "date" })
  billingPeriodEnd!: Date;

  @Column({ type: "timestamp with time zone" })
  startedAt!: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  completedAt!: Date;

  @Column({ type: "integer", default: 0 })
  totalCalls!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalMinutes!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ type: "integer", default: 0 })
  invoicesCreated!: number;

  @Column({ type: "integer", default: 0 })
  invoicesFailed!: number;

  @Column({ type: "text", nullable: true })
  errorMessage!: string;

  @Column({ type: "jsonb", nullable: true })
  metadata!: any;

  @Column({ type: "text", nullable: true })
  notes!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => Client, (client) => client.billingJobs, { nullable: true })
  @JoinColumn({ name: "clientId" })
  client!: Client;

  @OneToMany(() => PhoneUsage, (usage) => usage.billingJobId)
  phoneUsages!: PhoneUsage[];

  // Helper methods
  getDuration(): number {
    if (!this.startedAt || !this.completedAt) return 0;
    return this.completedAt.getTime() - this.startedAt.getTime();
  }

  isCompleted(): boolean {
    return this.status === BillingJobStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === BillingJobStatus.FAILED;
  }

  isInProgress(): boolean {
    return this.status === BillingJobStatus.IN_PROGRESS;
  }

  canRetry(): boolean {
    return this.status === BillingJobStatus.FAILED;
  }

  getSuccessRate(): number {
    if (this.invoicesCreated + this.invoicesFailed === 0) return 0;
    return (
      (this.invoicesCreated / (this.invoicesCreated + this.invoicesFailed)) *
      100
    );
  }

  getBillingPeriodString(): string {
    const start = this.billingPeriodStart.toISOString().split("T")[0];
    const end = this.billingPeriodEnd.toISOString().split("T")[0];
    return `${start} to ${end}`;
  }
}
