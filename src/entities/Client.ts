import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { PhoneUsage } from "./PhoneUsage";
import { BillingJob } from "./BillingJob";

@Entity("clients")
export class Client {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  genesysClientId!: string;

  @Column({ unique: true, nullable: true })
  qboCustomerId!: string;

  @Column()
  name!: string;

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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @OneToMany(() => PhoneUsage, (usage) => usage.client)
  phoneUsages!: PhoneUsage[];

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
    return this.name || this.genesysClientId;
  }

  getFormattedRate(): string {
    return `$${this.ratePerMinute.toFixed(2)}`;
  }

  hasQboMapping(): boolean {
    return !!this.qboCustomerId;
  }

  isComplete(): boolean {
    return !!(this.name && this.genesysClientId && this.email);
  }
}
