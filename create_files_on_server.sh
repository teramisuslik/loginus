#!/bin/bash
# Скрипт для создания всех файлов на сервере

cd /root/loginus-backend

# Создаем директории
mkdir -p src/auth/entities src/auth/services src/auth/controllers src/auth/dto src/database/migrations

# Создаем oauth-client.entity.ts
cat > src/auth/entities/oauth-client.entity.ts << 'EOF'
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
EOF

# Создаем authorization-code.entity.ts
cat > src/auth/entities/authorization-code.entity.ts << 'EOF'
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

  @Column({ type: 'varchar', length: 255, nullable: true })
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
EOF

echo "✅ Файлы созданы на сервере"
echo "📋 Теперь выполните:"
echo "  1. npm install cookie-parser @types/cookie-parser"
echo "  2. npm run migration:run"
echo "  3. npm run build"
echo "  4. Перезапустите приложение"

