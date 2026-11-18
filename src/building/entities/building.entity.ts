import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Community } from '../../community/entities/community.entity.js';

@Entity()
export class Building {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  /** How long an invitation link to this building stays valid; Clerk's default is 30 */
  @Column({ type: 'int', default: 30 })
  inviteExpiryDays: number;

  /** Residents also see and book spots of the other buildings in this community */
  @Column({ type: 'uuid', nullable: true })
  communityId: string | null;

  @ManyToOne('Community', 'buildings', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'communityId' })
  community: Community | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
