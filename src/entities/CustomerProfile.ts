import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { PhoneUsage } from "./PhoneUsage";
import { BillingJob } from "./BillingJob";

@Entity("customer_profiles")
export class CustomerProfile {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true, nullable: true })
  qboCustomerId!: string;

  @Column({ type: "text", array: true, default: [] })
  genesysQueueNames!: string[];

  @Column({ nullable: true })
  email!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ nullable: true })
  address!: string;

  @Column({ nullable: true })
  city!: string;

  @Column({ nullable: true })
  state!: string;

  @Column({ nullable: true })
  zipCode!: string;

  @Column({ nullable: true })
  country!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 1.0 })
  ratePerMinute!: number;

  @Column({ nullable: true })
  taxCode!: string;

  @Column({ type: "text", nullable: true })
  notes!: string;

  @Column({ type: "text", nullable: true })
  qboCompanyName!: string;

  @Column({ type: "text", nullable: true })
  qboDisplayName!: string;

  @Column({ type: "text", nullable: true })
  qboPrimaryEmailAddr!: string;

  @Column({ type: "text", nullable: true })
  qboPrimaryPhone!: string;

  @Column({ type: "text", nullable: true })
  qboBillAddr!: string;

  @Column({ type: "text", nullable: true })
  qboShipAddr!: string;

  @Column({ type: "json", nullable: true })
  qboMetadata!: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @OneToMany(() => PhoneUsage, (usage) => usage.customerProfile)
  phoneUsages!: PhoneUsage[];

  @OneToMany(() => BillingJob, (job) => job.customerProfile)
  billingJobs!: BillingJob[];

  // Helper methods
  getFullAddress(): string {
    const parts = [
      this.address,
      this.city,
      this.state,
      this.zipCode,
      this.country,
    ];
    return parts.filter((part) => part).join(", ");
  }

  getDisplayName(): string {
    return this.qboDisplayName || this.name;
  }

  getFormattedRate(): string {
    return `$${this.ratePerMinute.toFixed(2)}`;
  }

  hasQboMapping(): boolean {
    return !!this.qboCustomerId;
  }

  hasGenesysQueues(): boolean {
    return this.genesysQueueNames && this.genesysQueueNames.length > 0;
  }

  isComplete(): boolean {
    return !!(this.name && this.hasGenesysQueues() && this.email);
  }

  getGenesysQueueNamesString(): string {
    return this.genesysQueueNames
      ? this.genesysQueueNames.join(", ")
      : "No queues assigned";
  }

  // Check if a specific queue name belongs to this customer
  hasQueue(queueName: string): boolean {
    return this.genesysQueueNames
      ? this.genesysQueueNames.includes(queueName)
      : false;
  }

  // Add a new queue name
  addQueue(queueName: string): void {
    if (!this.genesysQueueNames) {
      this.genesysQueueNames = [];
    }
    if (!this.genesysQueueNames.includes(queueName)) {
      this.genesysQueueNames.push(queueName);
    }
  }

  // Remove a queue name
  removeQueue(queueName: string): void {
    if (this.genesysQueueNames) {
      this.genesysQueueNames = this.genesysQueueNames.filter(
        (q) => q !== queueName
      );
    }
  }
}
