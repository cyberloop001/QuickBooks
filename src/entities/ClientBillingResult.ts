import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { BillingJob } from "./BillingJob";
import { Client } from "./Client";

export enum ClientBillingStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED",
}

@Entity("client_billing_results")
export class ClientBillingResult {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  billingJobId!: string;

  @Column()
  clientId!: string;

  @Column({
    type: "enum",
    enum: ClientBillingStatus,
    default: ClientBillingStatus.PENDING,
  })
  status!: ClientBillingStatus;

  @Column({ type: "int", default: 0 })
  totalCalls!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalMinutes!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ type: "text", nullable: true })
  qboInvoiceId!: string;

  @Column({ type: "text", nullable: true })
  qboInvoiceNumber!: string;

  @Column({ type: "text", nullable: true })
  error!: string;

  @Column({ type: "json", nullable: true })
  metadata!: any;

  @Column({ type: "timestamp", nullable: true })
  processedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => BillingJob, (job) => job.clientBillingResults)
  @JoinColumn({ name: "billingJobId" })
  billingJob!: BillingJob;

  @ManyToOne(() => Client)
  @JoinColumn({ name: "clientId" })
  client!: Client;
}
