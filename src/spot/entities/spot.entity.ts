import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Schedule } from '../schedule/entities/schedule.entity.js';
import type { AppUser } from '../../user/entities/app-user.entity.js';

export enum SpotStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

@Entity()
export class Spot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Whoever created the spot; only they can delete it */
  @Column()
  userId: string;

  /** The creator. Null if they haven't signed in since accounts moved to app_user */
  @ManyToOne('AppUser', { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'userId' })
  owner: AppUser | null;

  @Column()
  buildingId: string;

  /** Building of the owning apartment, which needn't be the one the spot is in */
  @Column({ type: 'varchar', nullable: true })
  apartmentBuildingId: string | null;

  /** Everyone in this apartment of `apartmentBuildingId` co-owns the spot; null shares it with nobody */
  @Column({ type: 'varchar', nullable: true })
  apartment: string | null;

  @Column()
  number: number;

  @Column()
  description: string;

  @Column()
  long: string;

  @Column()
  lat: string;

  /** Underground spots are only offered to owners of a confirmed underground spot */
  @Column({ default: false })
  underground: boolean;

  @Column({ type: 'enum', enum: SpotStatus, default: SpotStatus.PENDING })
  status: SpotStatus;

  /** Why an admin rejected the spot; cleared when it's approved or the owner resubmits */
  @Column({ type: 'varchar', length: 500, nullable: true })
  rejectionReason: string | null;

  @Column()
  fileId: string;

  @OneToMany('Schedule', 'spot')
  schedules: Schedule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
