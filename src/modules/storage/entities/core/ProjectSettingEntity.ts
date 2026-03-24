import { Entity, PrimaryColumn, Column, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ProjectEntity } from './ProjectEntity';

@Entity('project_settings')
export class ProjectSettingEntity {
  @PrimaryColumn('text') project_id!: string;
  @PrimaryColumn('text') setting_key!: string;
  @Column('text') setting_value!: string;
  @UpdateDateColumn({ type: 'datetime' }) updated_at!: Date;

  @ManyToOne(() => ProjectEntity, project => project.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;
}
