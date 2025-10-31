import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'default-secret',
    });
  }

  /**
   * Автоматически вызывается после валидации JWT
   * Результат попадает в request.user
   */
  async validate(payload: JwtPayload): Promise<any> {
    console.log('🔍 [JwtStrategy] validate called with payload:', {
      sub: payload.sub,
      email: payload.email,
      hasRoles: !!payload.roles,
      rolesCount: payload.roles?.length || 0,
      iat: payload.iat,
      exp: payload.exp,
      now: Date.now() / 1000
    });
    
    try {
      const user = await this.usersService.findById(payload.sub);
      
      if (!user) {
        console.error('❌ [JwtStrategy] User not found for userId:', payload.sub);
        throw new UnauthorizedException('User not found');
      }
      
      if (!user.isActive) {
        console.error('❌ [JwtStrategy] User is not active:', payload.sub);
        throw new UnauthorizedException('User is not active');
      }

      console.log('✅ [JwtStrategy] User validated:', user.id, user.email);

      // Роли и права берем из JWT payload (они уже там)
      const roles = payload.roles || [];
      const permissions = payload.permissions || [];

      console.log('✅ [JwtStrategy] Returning user object with roles:', roles.length);

      // Возвращаем данные, которые попадут в request.user
      return {
        userId: payload.sub,
        email: payload.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        emailVerified: user.emailVerified,
        organizationId: payload.organizationId,
        teamId: payload.teamId,
        organizations: user.organizations,
        teams: user.teams,
        roles: roles,
        permissions: permissions,
      };
    } catch (error) {
      console.error('❌ [JwtStrategy] Error in validate:', error);
      console.error('❌ [JwtStrategy] Error message:', error?.message);
      console.error('❌ [JwtStrategy] Error stack:', error?.stack);
      throw error;
    }
  }
}
