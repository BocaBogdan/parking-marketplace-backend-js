import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { BuildingMembership } from '../../membership/entities/building-membership.entity.js';

/** A signed-up person. Clerk owns sign-in; what they may do lives here and in memberships */
@Entity()
export class AppUser {
  /** The Clerk user id, which spots, cars and bookings store as `userId` */
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', nullable: true })
  lastName: string | null;

  /** Manages every building and creates new ones */
  @Column({ default: false })
  isAdmin: boolean;

  @OneToMany('BuildingMembership', 'user')
  memberships: BuildingMembership[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
