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

  @Column()
  userId: string;

  /** Null if the owner hasn't signed in since accounts moved to app_user */
  @ManyToOne('AppUser', { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'userId' })
  owner: AppUser | null;

  @Column()
  buildingId: string;

  @Column()
  number: number;

  @Column()
  description: string;

  @Column()
  long: string;

  @Column()
  lat: string;

  @Column({ type: 'enum', enum: SpotStatus, default: SpotStatus.PENDING })
  status: SpotStatus;

  @Column()
  fileId: string;

  @OneToMany('Schedule', 'spot')
  schedules: Schedule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
