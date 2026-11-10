import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { Building } from '../../building/entities/building.entity.js';
import type { FeatureFlag } from './feature-flag.entity.js';

/** Whether one building has one flag on */
@Entity()
@Unique(['buildingId', 'flagKey'])
export class BuildingFeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  buildingId: string;

  @ManyToOne('Building', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buildingId' })
  building: Building;

  @Column()
  flagKey: string;

  @ManyToOne('FeatureFlag', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flagKey' })
  flag: FeatureFlag;

  @Column({ default: false })
  enabled: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
