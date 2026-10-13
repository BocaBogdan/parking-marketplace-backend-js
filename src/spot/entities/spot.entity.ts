import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Schedule } from '../schedule/entities/schedule.entity.js';

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

  @Column()
  buildingId: string;

  @Column()
  number: number;

  @Column()
  description: string;

  // @Column()
  // long: string;
  //
  // @Column()
  // lat: string;
  //
  // @Column({ type: 'enum', enum: SpotStatus, default: SpotStatus.PENDING })
  // status: SpotStatus;
  //
  // @Column()
  // fileId: string;

  @OneToMany('Schedule', 'spot')
  schedules: Schedule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
