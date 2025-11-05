#!/bin/bash
# Скрипт для полного деплоя OAuth функционала на сервер

cd /root/loginus-backend

echo "📁 Создаю директории..."
mkdir -p src/auth/entities src/auth/services src/auth/controllers src/auth/dto src/database/migrations

echo "📝 Создаю файлы..."

# oauth-client.entity.ts
cat > src/auth/entities/oauth-client.entity.ts << 'EOFOAUTHCLIENT'
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
EOFOAUTHCLIENT

# authorization-code.entity.ts
cat > src/auth/entities/authorization-code.entity.ts << 'EOFAUTHCODE'
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
EOFAUTHCODE

# oauth-token.dto.ts
cat > src/auth/dto/oauth-token.dto.ts << 'EOFDTO'
import { IsString, IsNotEmpty } from 'class-validator';

export class OAuthTokenDto {
  @IsString()
  @IsNotEmpty()
  grant_type: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  redirect_uri: string;

  @IsString()
  @IsNotEmpty()
  client_id: string;

  @IsString()
  @IsNotEmpty()
  client_secret: string;
}
EOFDTO

echo "✅ Файлы entities и dto созданы"
echo "📦 Устанавливаю зависимости..."
npm install cookie-parser @types/cookie-parser

echo "🗄️ Запускаю миграции..."
npm run migration:run

echo "🔨 Собираю проект..."
npm run build

echo "🔄 Перезапускаю приложение..."
pm2 restart loginus-backend 2>/dev/null || systemctl restart loginus-backend 2>/dev/null || docker-compose restart backend 2>/dev/null || echo "⚠️ Перезапустите приложение вручную"

echo "✅ Деплой завершен!"

