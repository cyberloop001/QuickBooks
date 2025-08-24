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

  @Column({ unique: true, nullable: true })
  qboCustomerId!: string;

  @Column({ type: "text", array: true, default: [] })
  genesysQueueNames!: string[];

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 1.0 })
  ratePerMinute!: number;

  @Column({ nullable: true })
  taxCode!: string;

  @Column({ type: "text", nullable: true })
  notes!: string;

  // Billing Configuration Fields
  @Column({ type: "integer", default: 1 })
  billDate!: number; // Day of month to bill (1-31)

  @Column({ type: "integer", default: 1 })
  billingPeriodStart!: number; // Day of month billing period starts (1-31)

  @Column({ type: "integer", default: 31 })
  billingPeriodEnd!: number; // Day of month billing period ends (1-31)

  @Column({ type: "integer", default: 0 })
  minimumMinutes!: number; // Minimum minutes included in base rate

  @Column({ type: "decimal", precision: 10, scale: 2, default: 1.0 })
  overageRatePerMinute!: number; // Rate for minutes over minimum

  // QBO Customer Fields (Required for QBO integration)
  @Column({ type: "text" })
  qboDisplayName!: string; // Required field for QBO

  @Column({ type: "text", nullable: true })
  qboCompanyName!: string;

  @Column({ type: "text", nullable: true })
  qboGivenName!: string;

  @Column({ type: "text", nullable: true })
  qboFamilyName!: string;

  @Column({ type: "text", nullable: true })
  qboMiddleName!: string;

  @Column({ type: "text", nullable: true })
  qboTitle!: string;

  @Column({ type: "text", nullable: true })
  qboSuffix!: string;

  // QBO Contact Fields
  @Column({ type: "text", nullable: true })
  qboPrimaryEmailAddr!: string;

  @Column({ type: "text", nullable: true })
  qboPrimaryPhone!: string;

  // QBO Address Fields (replacing old address structure)
  @Column({ type: "text", nullable: true })
  qboLine1!: string;

  @Column({ type: "text", nullable: true })
  qboCity!: string;

  @Column({ type: "text", nullable: true })
  qboCountrySubDivisionCode!: string;

  @Column({ type: "text", nullable: true })
  qboPostalCode!: string;

  @Column({ type: "text", nullable: true })
  qboCountry!: string;

  // QBO Metadata
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
      this.qboLine1,
      this.qboCity,
      this.qboCountrySubDivisionCode,
      this.qboPostalCode,
      this.qboCountry,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : "No address provided";
  }

  getDisplayName(): string {
    if (this.qboCompanyName) {
      return this.qboCompanyName;
    }
    if (this.qboGivenName && this.qboFamilyName) {
      const parts = [
        this.qboTitle,
        this.qboGivenName,
        this.qboMiddleName,
        this.qboFamilyName,
        this.qboSuffix,
      ].filter(Boolean);
      return parts.join(" ");
    }
    return this.qboDisplayName;
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
    return !!(
      this.qboDisplayName &&
      this.genesysQueueNames &&
      this.genesysQueueNames.length > 0 &&
      this.ratePerMinute > 0
    );
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

  // Billing helper methods
  getBillingPeriodForMonth(
    year: number,
    month: number
  ): { start: Date; end: Date } {
    const startDate = new Date(year, month - 1, this.billingPeriodStart);
    const endDate = new Date(year, month - 1, this.billingPeriodEnd);

    // If billing period spans months, adjust accordingly
    if (this.billingPeriodEnd < this.billingPeriodStart) {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    return { start: startDate, end: endDate };
  }

  getNextBillingDate(): Date {
    const now = new Date();
    const currentDay = now.getDate();

    let nextBillingMonth = now.getMonth();
    let nextBillingYear = now.getFullYear();

    // If we've passed this month's billing date, move to next month
    if (currentDay >= this.billDate) {
      nextBillingMonth++;
      if (nextBillingMonth > 11) {
        nextBillingMonth = 0;
        nextBillingYear++;
      }
    }

    return new Date(nextBillingYear, nextBillingMonth, this.billDate);
  }

  calculateBillingAmount(totalMinutes: number): {
    baseAmount: number;
    overageAmount: number;
    totalAmount: number;
  } {
    const baseMinutes = Math.min(totalMinutes, this.minimumMinutes);
    const overageMinutes = Math.max(0, totalMinutes - this.minimumMinutes);

    const baseAmount = baseMinutes * this.ratePerMinute;
    const overageAmount = overageMinutes * this.overageRatePerMinute;
    const totalAmount = baseAmount + overageAmount;

    return { baseAmount, overageAmount, totalAmount };
  }

  getBillingSummary(): string {
    if (this.minimumMinutes > 0) {
      return `${
        this.minimumMinutes
      } min included, then $${this.overageRatePerMinute.toFixed(2)}/min`;
    }
    return `$${this.ratePerMinute.toFixed(2)}/min`;
  }

  isBillingDue(): boolean {
    const now = new Date();
    const currentDay = now.getDate();
    return currentDay === this.billDate;
  }
}
