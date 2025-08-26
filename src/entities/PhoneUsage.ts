import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { CustomerProfile } from "./CustomerProfile";

@Entity("phone_usage")
export class PhoneUsage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  callId!: string;

  @Column()
  customerProfileId!: string;

  @Column({ nullable: true })
  genesysQueueName!: string;

  @Column({ type: "timestamp with time zone" })
  startedAt!: Date;

  @Column({ type: "timestamp with time zone" })
  endedAt!: Date;

  @Column({ type: "integer" })
  billableSeconds!: number;

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
  @ManyToOne(() => CustomerProfile, (profile) => profile.phoneUsages)
  @JoinColumn({ name: "customerProfileId" })
  customerProfile!: CustomerProfile;

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
    return this.startedAt >= startDate && this.startedAt <= endDate;
  }

  // Get the customer name from the profile
  getCustomerName(): string {
    return this.customerProfile
      ? this.customerProfile.getDisplayName()
      : "Unknown Customer";
  }

  // Get the queue name (either from this record or from the profile)
  getQueueName(): string {
    return this.genesysQueueName || "Unknown Queue";
  }

  // Get the queue ID
  getQueueId(): string {
    return this.genesysQueueName || "unknown";
  }

  // Check if this is a voice call
  isVoiceCall(): boolean {
    return true; // Default to true since we removed mediaType
  }
}
