import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('ddl_snapshots')
export class DdlSnapshotEntity {
  @PrimaryColumn('text') id!: string;
  @Column('text') environment!: string;
  @Column('text') database_name!: string;
  @Column('text', { default: 'mysql' }) database_type!: string;
  @Column('text') ddl_type!: string;
  @Column('text') ddl_name!: string;
  @Column('text', { nullable: true }) file_path!: string;
  @Column('text', { nullable: true }) ddl_content!: string;
  @Column('text') hash!: string;
  @CreateDateColumn({ type: 'datetime' }) created_at!: Date;
}
