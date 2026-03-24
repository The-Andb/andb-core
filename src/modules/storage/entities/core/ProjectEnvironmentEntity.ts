import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ProjectEntity } from './ProjectEntity';

@Entity('project_environments')
export class ProjectEnvironmentEntity {
  @PrimaryColumn('text') id!: string;
  @Column('text') project_id!: string;
  @Column('text') env_name!: string;
  @Column('text', { default: 'mysql' }) source_type!: string;
  @Column('text', { nullable: true }) path!: string;
  
  @Column('text', { nullable: true }) host!: string;
  @Column('integer', { nullable: true }) port!: number;
  @Column('text', { nullable: true }) username!: string;
  @Column('text', { nullable: true }) database_name!: string;

  @Column('integer', { default: 0 }) use_ssh_tunnel!: number;
  @Column('text', { nullable: true }) ssh_host!: string;
  @Column('integer', { nullable: true }) ssh_port!: number;
  @Column('text', { nullable: true }) ssh_username!: string;
  @Column('text', { nullable: true }) ssh_key_path!: string;

  @Column('integer', { default: 0 }) use_ssl!: number;
  @Column('integer', { default: 0 }) is_read_only!: number;

  @CreateDateColumn({ type: 'datetime' }) created_at!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updated_at!: Date;

  @ManyToOne(() => ProjectEntity, project => project.environments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;
}
