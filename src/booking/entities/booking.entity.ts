import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Exclusion,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Car } from '../../car/entities/car.entity.js';
import type { AppUser } from '../../user/entities/app-user.entity.js';

/**
 * One reservation as real instants, so a window past midnight or across a DST change is
 * still one row. Postgres refuses overlapping bookings of a spot, so two simultaneous
 * requests for the same slot can't both succeed.
 */
@Entity()
@Check('"endsAt" > "startsAt"')
@Exclusion(
  'booking_no_overlap',
  'USING gist ("spotId" WITH =, tstzrange("startsAt", "endsAt") WITH &&)',
)
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  /** Null if the driver hasn't signed in since accounts moved to app_user */
  @ManyToOne('AppUser', { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'userId' })
  driver: AppUser | null;

  @Column({ type: 'uuid' })
  spotId: string;

  @Column({ type: 'uuid' })
  carId: string;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  /** Null once the driver has removed the car */
  @ManyToOne('Car', { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'carId' })
  car: Car | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
