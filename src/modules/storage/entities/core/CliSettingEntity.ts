import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('cli_settings')
export class CliSettingEntity {
  @PrimaryColumn('text') key!: string;
  @Column('text') value!: string;
  @UpdateDateColumn({ type: 'datetime' }) updated_at!: Date;
}
