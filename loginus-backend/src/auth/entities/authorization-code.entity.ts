import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('authorization_codes')
@Index(['code'])
@Index(['clientId'])
@Index(['userId'])
@Index(['expiresAt'])
export class AuthorizationCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  code: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  clientId: string;

  @Column({ type: 'varchar', length: 500 })
  redirectUri: string;

  @Column({ type: 'text', array: true, default: '{}' })
  scopes: string[];

  @Column({ type: 'text', nullable: true })
  state: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  isUsed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  // Связь с пользователем (опционально, для удобства)
  user?: User;
}

