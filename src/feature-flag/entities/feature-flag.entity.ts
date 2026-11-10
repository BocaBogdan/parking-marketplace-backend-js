import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** A switch that buildings can turn on; buildings without a row for it have it off */
@Entity()
export class FeatureFlag {
  /** Code checks flags by this key, e.g. SPOT_DOCUMENT_NOT_REQUIRED */
  @PrimaryColumn()
  key: string;

  @Column({ default: '' })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
