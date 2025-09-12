import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Team } from "./Team";

@Entity("queue_assignments")
export class QueueAssignment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  queueId!: string;

  @Column()
  queueName!: string;

  @Column()
  teamId!: string;

  @Column({ default: () => "now()" })
  assignedAt!: Date;

  @Column({ nullable: true })
  assignedBy!: string;

  @Column({ nullable: true })
  notes!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => Team, (team) => team.queueAssignments)
  @JoinColumn({ name: "teamId" })
  team!: Team;

  // Helper methods
  getAssignmentAge(): number {
    return Date.now() - this.assignedAt.getTime();
  }

  getAssignmentAgeInDays(): number {
    return Math.floor(this.getAssignmentAge() / (1000 * 60 * 60 * 24));
  }
}
