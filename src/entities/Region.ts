import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Team } from "./Team";

@Entity("regions")
export class Region {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @OneToMany(() => Team, (team) => team.region)
  teams!: Team[];

  // Helper methods
  getActiveTeams(): Team[] {
    return this.teams?.filter(team => team.isActive) || [];
  }

  getTeamCount(): number {
    return this.teams?.length || 0;
  }

  getActiveTeamCount(): number {
    return this.getActiveTeams().length;
  }
}
