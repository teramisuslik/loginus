import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { EmailAuthService } from './email-auth.service';
import { EmailAuthController } from './email-auth.controller';
import { EmailAuthMicroModule } from './email-auth.micro-module';
import { User } from '../../../users/entities/user.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [EmailAuthController],
  providers: [EmailAuthService, EmailAuthMicroModule],
  exports: [EmailAuthService, EmailAuthMicroModule],
})
export class EmailAuthModule {}
