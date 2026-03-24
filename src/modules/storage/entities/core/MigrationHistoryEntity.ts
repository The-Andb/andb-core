import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('migration_history')
export class MigrationHistoryEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column('text') environment!: string;
  @Column('text') database_name!: string;
  @Column('text') migration_type!: string;
  @Column('text') target_objects!: string;
  @Column('text') status!: string;
  @Column('text', { nullable: true }) error_message!: string;
  @CreateDateColumn({ type: 'datetime' }) executed_at!: Date;
  @Column('text', { nullable: true }) executed_by!: string;
}
