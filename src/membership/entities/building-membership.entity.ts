import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { AppUser } from '../../user/entities/app-user.entity.js';
import type { Building } from '../../building/entities/building.entity.js';

export enum MembershipRole {
  RESIDENT = 'RESIDENT',
  BUILDING_ADMIN = 'BUILDING_ADMIN',
}

/** A user's place in one building; a user can belong to several */
@Entity()
@Unique(['userId', 'buildingId'])
export class BuildingMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne('AppUser', 'memberships', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: AppUser;

  @Column()
  buildingId: string;

  @ManyToOne('Building', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buildingId' })
  building: Building;

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

  @CreateDateColumn()
  createdAt: Date;
}
