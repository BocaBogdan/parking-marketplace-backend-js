import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Spot } from '../../entities/spot.entity.js';

@Entity()
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  spotId: string;

  @Column({ type: 'smallint' })
  dayOfWeek: number;

  @Column({ type: 'smallint' })
  startMinute: number;

  @Column({ type: 'smallint' })
  endMinute: number;

  @ManyToOne('Spot', 'schedules', { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'spotId' })
  spot: Spot;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
