import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('oauth_clients')
@Index(['clientId'])
export class OAuthClient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  clientId: string;

  @Column({ type: 'varchar', length: 255 })
  clientSecret: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', array: true, default: '{}' })
  redirectUris: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  scopes: string[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

