import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('micro_module_settings')
export class MicroModuleSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'moduleName', unique: true, length: 100 })
  moduleName: string;

  @Column({ name: 'isEnabled', default: true })
  isEnabled: boolean;

  @Column({ name: 'config', type: 'jsonb', nullable: true })
  config: Record<string, any>;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
