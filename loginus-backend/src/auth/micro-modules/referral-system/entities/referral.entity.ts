import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { User } from '../../../../users/entities/user.entity';

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255, name: 'referral_code', nullable: false })
  referralCode: string;

  @Column({ type: 'boolean', default: false, name: 'isUsed' })
  isUsed: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'usedAt' })
  usedAt: Date | null;

  @Column({ type: 'integer', default: 1, name: 'usage_limit', nullable: true })
  usageLimit: number | null;

  @Column({ type: 'integer', default: 0, name: 'usage_count', nullable: false })
  usageCount: number;

  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'referrer_id' })
  referrer: User;

  @RelationId((referral: Referral) => referral.referrer)
  referrerId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', eager: false, nullable: true })
  @JoinColumn({ name: 'referred_user_id' })
  referred: User | null;

  @RelationId((referral: Referral) => referral.referred)
  referredId: string | null;
}
