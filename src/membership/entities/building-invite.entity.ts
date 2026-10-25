import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MembershipRole } from './building-membership.entity.js';

export enum InviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REVOKED = 'REVOKED',
}

/**
 * An invitation to a building. Someone who already has an account joins straight away
 * (ACCEPTED); anyone else gets a Clerk invitation, and the invite turns into a membership
 * when they sign up with this email.
 */
@Entity()
@Index(['buildingId', 'email'], {
  unique: true,
  where: `"status" = 'PENDING'`,
})
export class BuildingInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  buildingId: string;

  /** Lower-cased */
  @Column()
  email: string;

  @Column({
    type: 'enum',
    enum: MembershipRole,
    default: MembershipRole.RESIDENT,
  })
  role: MembershipRole;

  @Column()
  apartment: string;

  @Column()
  eBlocUserID: string;

  /** Clerk user id of whoever sent it */
  @Column()
  invitedBy: string;

  @Column({ type: 'varchar', nullable: true })
  clerkInvitationId: string | null;

  @Column({ type: 'enum', enum: InviteStatus, default: InviteStatus.PENDING })
  status: InviteStatus;

  @CreateDateColumn()
  createdAt: Date;
}
