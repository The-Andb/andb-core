import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('ddl_exports')
export class DdlExportEntity {
  @PrimaryColumn('text') id!: string;
  @Column('text') environment!: string;
  @Column('text') database_name!: string;
  @Column('text', { default: '' }) export_type!: string;
  @Column('text', { default: '' }) export_name!: string;
  @Column('text', { nullable: true }) file_path!: string;
  @Column('text', { nullable: true }) ddl_content!: string;
  @CreateDateColumn({ type: 'datetime' }) exported_at!: Date;
}
