import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('comparisons')
export class ComparisonEntity {
  @PrimaryColumn('text') id!: string;
  @Column('text', { default: '' }) source_env!: string;
  @Column('text', { default: '' }) target_env!: string;
  @Column('text') database_name!: string;
  @Column('text', { default: 'mysql' }) database_type!: string;
  @Column('text') ddl_type!: string;
  @Column('text') ddl_name!: string;
  @Column('text') status!: string;
  @Column('text', { nullable: true }) file_path!: string;
  @Column('text', { nullable: true }) alter_statements!: string;
  @CreateDateColumn({ type: 'datetime' }) compared_at!: Date;
}
