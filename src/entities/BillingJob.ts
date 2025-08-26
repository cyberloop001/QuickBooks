import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { CustomerProfile } from "./CustomerProfile";

export enum BillingJobStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum BillingJobType {
  MONTHLY = "MONTHLY",
  MANUAL = "MANUAL",
  DRY_RUN = "DRY_RUN",
}

@Entity("billing_jobs")
export class BillingJob {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  jobId!: string;

  @Column({
    type: "enum",
    enum: BillingJobStatus,
    default: BillingJobStatus.PENDING,
  })
  status!: BillingJobStatus;

  @Column({
    type: "enum",
    enum: BillingJobType,
    default: BillingJobType.MONTHLY,
  })
  type!: BillingJobType;

  @Column({ type: "timestamp" })
  startDate!: Date;

  @Column({ type: "timestamp" })
  endDate!: Date;

  @Column({ type: "int", default: 0 })
  totalQueues!: number;

  @Column({ nullable: true })
  queueId!: string;

  @Column({ nullable: true })
  queueName!: string;

  @Column({ type: "int", default: 0 })
  totalInvoices!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalMinutes!: number;

  @Column({ type: "int", default: 0 })
  successfulInvoices!: number;

  @Column({ type: "int", default: 0 })
  failedInvoices!: number;

  @Column({ type: "text", nullable: true })
  error!: string;

  @Column({ type: "json", nullable: true })
  metadata!: any;

  @Column({ type: "timestamp", nullable: true })
  startedAt!: Date;

  @Column({ type: "timestamp", nullable: true })
  completedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships

  // Keep customer profile for backward compatibility but make it optional
  @ManyToOne(() => CustomerProfile, (profile) => profile.billingJobs, {
    nullable: true,
  })
  @JoinColumn({ name: "customerProfileId" })
  customerProfile?: CustomerProfile;

  // Helper methods
  getTotalQueues(): number {
    return this.totalQueues;
  }

  getTotalInvoices(): number {
    return this.totalInvoices;
  }

  getTotalAmount(): number {
    return this.totalAmount;
  }

  getTotalMinutes(): number {
    return this.totalMinutes;
  }

  getSuccessRate(): number {
    if (this.totalInvoices === 0) return 0;
    return (this.successfulInvoices / this.totalInvoices) * 100;
  }
}
