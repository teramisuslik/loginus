import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Referral } from './entities/referral.entity';
import { User } from '../../../users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Генерация реферального кода для пользователя
   */
  async generateReferralCode(userId: string, expiresInDays: number = 30, usageLimit: number | null = null): Promise<Referral> {
    this.logger.log(`Генерация реферального кода для пользователя ${userId}`);

    // Генерируем уникальный код
    const code = this.generateUniqueCode();
    
    // Лимиты убраны - не устанавливаем expiresAt и usageLimit
    const expiresAt = null; // Убираем ограничение по времени
    const finalUsageLimit = null; // Убираем ограничение по количеству использований
    
    // Используем прямой SQL INSERT для гарантии сохранения всех полей
    const referralId = uuidv4();
    const metadataJson = JSON.stringify({
      generatedAt: new Date().toISOString(),
      expiresInDays: null, // Лимиты убраны
      usageLimit: null, // Лимиты убраны
    });
    
    this.logger.log(`Создание реферальной записи через SQL: id=${referralId}, code=${code}, userId=${userId}`);
    
    // Проверяем, что userId не null
    if (!userId) {
      this.logger.error(`userId is null or undefined!`);
      throw new Error('Пользователь не найден');
    }
    
    // Логируем параметры перед запросом
    const params = [
      referralId,      // $1: id
      code,            // $2: code
      code,            // $3: referral_code
      userId,          // $4: referrer_id
      expiresAt,       // $5: expires_at
      false,           // $6: isUsed
      metadataJson,    // $7: metadata
      new Date(),      // $8: created_at
      new Date(),      // $9: updated_at
    ];
    
    this.logger.log(`SQL параметры:`, {
      id: params[0],
      code: params[1],
      referral_code: params[2],
      referrer_id: params[3],
      expires_at: params[4],
      isUsed: params[5],
      metadata: params[6],
      created_at: params[7],
      updated_at: params[8],
    });
    
    // Используем прямой SQL INSERT с явным указанием всех колонок
    // Проверяем, что все значения передаются правильно
    this.logger.log(`Выполняем SQL INSERT с параметрами:`, {
      id: referralId,
      referrer_id: userId,
      referral_code: code,
      expires_at: expiresAt,
      isUsed: false,
      metadata: metadataJson.substring(0, 50),
      created_at: new Date(),
      updated_at: new Date(),
      code: code,
    });
    
    // Загружаем пользователя для установки relation
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new Error('Пользователь не найден');
    }
    
    // Используем TypeORM .save() - он правильно преобразует имена колонок
    const newReferral = this.referralRepository.create({
      id: referralId,
      code: code,
      referralCode: code, // Должен автоматически преобразоваться в referral_code через @Column({ name: 'referral_code' })
      referrer: user,
      expiresAt: null, // Убираем ограничение по времени
      isUsed: false,
      usageLimit: null, // Убираем ограничение по количеству использований
      usageCount: 0,
      metadata: JSON.parse(metadataJson),
    });
    
    this.logger.log(`Создаем referral через TypeORM:`, {
      id: newReferral.id,
      code: newReferral.code,
      referralCode: newReferral.referralCode,
      referrerId: (newReferral as any).referrerId,
    });
    
    const savedReferral = await this.referralRepository.save(newReferral);
    
    this.logger.log(`Реферальная запись создана через TypeORM: ${savedReferral.id}, referralCode: ${savedReferral.referralCode}`);
    
    // Проверяем, что referralCode был сохранен
    if (!savedReferral.referralCode) {
      this.logger.error(`КРИТИЧЕСКАЯ ОШИБКА: referralCode не был сохранен!`);
      throw new Error(`referralCode не был сохранен в базу данных`);
    }
    
    // Загружаем полную запись с relations
    const fullReferral = await this.referralRepository.findOne({
      where: { id: referralId },
      relations: ['referrer'],
    });
    
    if (!fullReferral) {
      this.logger.error(`Не удалось найти созданную запись с id=${referralId}`);
      throw new Error('Не удалось создать реферальный код');
    }
    
    this.logger.log(`Реферальный код ${code} создан для пользователя ${userId}`);
    
    return fullReferral;
  }

  /**
   * Генерация реферальной ссылки (генерирует код и возвращает полную ссылку)
   */
  async generateReferralLink(userId: string, expiresInDays: number = 30, usageLimit: number | null = null): Promise<{ code: string; link: string; referral: Referral }> {
    // Лимиты убраны - игнорируем параметры expiresInDays и usageLimit
    const referral = await this.generateReferralCode(userId, 30, null);
    
    // Получаем базовый URL из конфигурации или используем дефолтный
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 
                       this.configService.get<string>('APP_FRONTEND_URL') ||
                       'https://loginus.startapus.com';
    
    // Формируем полную реферальную ссылку
    const referralLink = `${frontendUrl}/index.html?ref=${referral.code}`;
    
    return {
      code: referral.code,
      link: referralLink,
      referral,
    };
  }

  /**
   * Использование реферального кода при регистрации
   */
  async useReferralCode(code: string, referredUserId: string, ipAddress?: string, userAgent?: string): Promise<Referral> {
    this.logger.log(`Использование реферального кода ${code} пользователем ${referredUserId}`);

    // Находим реферальный код
    const referral = await this.referralRepository.findOne({ 
      where: { code },
      relations: ['referrer']
    });

    if (!referral) {
      throw new NotFoundException('Реферальный код не найден');
    }

    // Лимиты убраны - реферальные ссылки теперь без ограничений
    // Удаляем проверки expiresAt и usageLimit

    // Проверяем, что пользователь не использует свой собственный код
    if (referral.referrer?.id === referredUserId || referral.referrerId === referredUserId) {
      throw new BadRequestException('Нельзя использовать собственный реферальный код');
    }

    // Обновляем реферальную запись
    referral.usageCount = (referral.usageCount || 0) + 1;
    
    // Не помечаем как использованную, так как лимиты убраны
    // isUsed и usedAt больше не используются
    
    // Устанавливаем referred через объект User (только для первого использования или если это последнее)
    if (!referral.referred && referral.usageCount === 1) {
      const referredUser = await this.userRepository.findOne({ where: { id: referredUserId } });
      if (referredUser) {
        referral.referred = referredUser;
      }
    }
    
    // Сохраняем информацию об использовании в metadata
    const usageHistory = referral.metadata?.usageHistory || [];
    usageHistory.push({
      userId: referredUserId,
      usedAt: new Date().toISOString(),
      ipAddress,
      userAgent,
    });
    
    referral.metadata = {
      ...referral.metadata,
      usageHistory,
      lastUsedAt: new Date(),
      lastUsedBy: referredUserId,
    };

    const updatedReferral = await this.referralRepository.save(referral);
    this.logger.log(`Реферальный код ${code} использован пользователем ${referredUserId} (использовано: ${updatedReferral.usageCount}${updatedReferral.usageLimit ? `/${updatedReferral.usageLimit}` : ''})`);

    return updatedReferral;
  }

  /**
   * Получение реферальных кодов пользователя
   */
  async getUserReferralCodes(userId: string): Promise<Referral[]> {
    return this.referralRepository.find({
      where: { referrer: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Получение статистики рефералов пользователя
   */
  async getUserReferralStats(userId: string): Promise<{
    totalCodes: number;
    usedCodes: number;
    pendingCodes: number;
    expiredCodes: number;
  }> {
    const referrals = await this.referralRepository.find({
      where: { referrer: { id: userId } },
    });

    const now = new Date();
    const stats = {
      totalCodes: referrals.length,
      usedCodes: referrals.filter(r => r.usageCount > 0).length,
      pendingCodes: referrals.filter(r => r.usageCount === 0).length,
      expiredCodes: 0, // Лимиты убраны - нет истекших ссылок
    };

    return stats;
  }

  /**
   * Проверка валидности реферального кода
   */
  async validateReferralCode(code: string): Promise<{ valid: boolean; message?: string; referrer?: User }> {
    const referral = await this.referralRepository.findOne({
      where: { code },
      relations: ['referrer']
    });

    if (!referral) {
      return { valid: false, message: 'Реферальный код не найден' };
    }

    // Лимиты убраны - не проверяем usageLimit и expiresAt

    return { valid: true, referrer: referral.referrer };
  }

  /**
   * Генерация уникального кода
   */
  private generateUniqueCode(): string {
    // Генерируем код из случайных символов
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }

  /**
   * Получение рефералов пользователя (кто использовал его коды)
   */
  async getUserReferrals(userId: string): Promise<Referral[]> {
    // Возвращаем все реферальные коды пользователя, которые использовались
    return this.referralRepository.find({
      where: { referrer: { id: userId } },
      relations: ['referred'],
      order: { usageCount: 'DESC', createdAt: 'DESC' },
    });
  }
}
