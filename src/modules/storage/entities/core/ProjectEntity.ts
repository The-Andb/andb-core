import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ProjectEnvironmentEntity } from './ProjectEnvironmentEntity';
import { ProjectSettingEntity } from './ProjectSettingEntity';

@Entity('projects')
export class ProjectEntity {
  @PrimaryColumn('text') id!: string;
  @Column('text') name!: string;
  @Column('text', { nullable: true }) description!: string;
  @Column('integer', { default: 0 }) is_favorite!: number;
  @Column('integer', { default: 0 }) order_index!: number;
  
  @CreateDateColumn({ type: 'datetime' }) created_at!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updated_at!: Date;

  @OneToMany(() => ProjectEnvironmentEntity, env => env.project, { cascade: true })
  environments?: ProjectEnvironmentEntity[];

  @OneToMany(() => ProjectSettingEntity, setting => setting.project, { cascade: true })
  settings?: ProjectSettingEntity[];
}
