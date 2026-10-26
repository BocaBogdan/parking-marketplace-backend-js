import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum OverrideType {
  /** Bookable even outside the weekly schedule */
  FREE = 'FREE',
  /** Not bookable, even inside the weekly schedule */
  BUSY = 'BUSY',
}

/**
 * A temporary exception to a spot's weekly schedule. It starts when the owner creates it
 * and lasts until `endsAt`, or until they end it when that's null. Ended overrides are
 * kept (with `endsAt` set) so statistics still know when the spot was offered.
 */
@Entity()
@Check('"endsAt" IS NULL OR "endsAt" > "startsAt"')
export class SpotOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  spotId: string;

  @Column({ type: 'enum', enum: OverrideType })
  type: OverrideType;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
