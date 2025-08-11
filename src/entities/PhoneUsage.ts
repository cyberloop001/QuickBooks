import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Client } from "./Client";

@Entity("phone_usage")
export class PhoneUsage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  callId!: string;

  @Column()
  clientId!: string;

  @Column({ type: "timestamp with time zone" })
  startedAt!: Date;

  @Column({ type: "timestamp with time zone" })
  endedAt!: Date;

  @Column({ type: "integer" })
  billableSeconds!: number;

  @Column({ type: "timestamp with time zone" })
  startedPst!: Date;

  @Column({ type: "timestamp with time zone" })
  endedPst!: Date;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  billableMinutes!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount!: number;

  @Column({ default: false })
  isBilled!: boolean;

  @Column({ nullable: true })
  billingJobId!: string;

  @Column({ nullable: true })
  qboInvoiceId!: string;

  @Column({ type: "timestamp with time zone", nullable: true })
  billedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  // Relationships
  @ManyToOne(() => Client, (client) => client.phoneUsages)
  @JoinColumn({ name: "clientId" })
  client!: Client;

  // Helper methods
  getDurationInMinutes(): number {
    return this.billableSeconds / 60;
  }

  getDurationInHours(): number {
    return this.billableSeconds / 3600;
  }

  calculateAmount(ratePerMinute: number): number {
    return Math.round(this.billableMinutes * ratePerMinute * 100) / 100;
  }

  isInBillingPeriod(startDate: Date, endDate: Date): boolean {
    return this.startedPst >= startDate && this.startedPst <= endDate;
  }
}
