import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { Region } from "./Region";
import { QueueAssignment } from "./QueueAssignment";

@Entity("teams")
export class Team {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @Column()
  regionId!: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => Region, (region) => region.teams)
  @JoinColumn({ name: "regionId" })
  region!: Region;

  @OneToMany(() => QueueAssignment, (assignment) => assignment.team)
  queueAssignments!: QueueAssignment[];

  // Helper methods
  getQueueCount(): number {
    return this.queueAssignments?.length || 0;
  }

  getActiveQueueCount(): number {
    return this.queueAssignments?.filter(assignment => assignment.team.isActive)?.length || 0;
  }
}
