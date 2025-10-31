import { IsEmail, IsString, IsEnum, IsOptional, IsUUID, MinLength, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InvitationType } from '../entities/invitation.entity';

export class CreateInvitationDto {
  @ApiProperty({ example: 'user@example.com', required: false, description: 'Email (если приглашаем по email)' })
  @ValidateIf((o) => !o.githubUsername && !o.telegramUsername)
  @IsEmail({}, { message: 'Некорректный email' })
  email?: string;

  @ApiProperty({ example: 'github_username', required: false, description: 'GitHub username (без @) - уникальный идентификатор пользователя на GitHub' })
  @ValidateIf((o) => !o.email && !o.telegramUsername)
  @IsOptional()
  @IsString()
  githubUsername?: string;

  @ApiProperty({ example: 'telegram_username', required: false, description: 'Telegram username (если приглашаем по Telegram)' })
  @ValidateIf((o) => !o.email && !o.githubUsername)
  @IsOptional()
  @IsString()
  telegramUsername?: string;

  @ApiProperty({ example: 'Иван', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Имя должно быть не менее 2 символов' })
  firstName?: string;

  @ApiProperty({ example: 'Петров', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Фамилия должна быть не менее 2 символов' })
  lastName?: string;

  @ApiProperty({ enum: InvitationType, example: InvitationType.ORGANIZATION })
  @IsEnum(InvitationType)
  type: InvitationType;

  @ApiProperty({ example: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({ example: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiProperty({ example: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiProperty({ example: 'editor', required: false })
  @IsOptional()
  @IsString()
  roleName?: string;

  @ApiProperty({ example: 7, required: false })
  @IsOptional()
  expiresInDays?: number;
}