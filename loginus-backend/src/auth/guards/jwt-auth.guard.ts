import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    
    console.log('🔍 [JwtAuthGuard] canActivate called');
    console.log('🔍 [JwtAuthGuard] Request path:', request.path);
    console.log('🔍 [JwtAuthGuard] Has auth header:', !!authHeader);
    console.log('🔍 [JwtAuthGuard] Token length:', token.length);
    console.log('🔍 [JwtAuthGuard] Token preview:', token.substring(0, 50) + '...');
    
    // Проверяем декоратор @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      console.log('✅ [JwtAuthGuard] Public endpoint, skipping auth');
      return true; // Пропускаем публичные endpoints
    }

    console.log('🔍 [JwtAuthGuard] Protected endpoint, validating JWT...');
    
    // Вызываем родительский метод с обработкой ошибок
    const result = super.canActivate(context);
    
    if (result instanceof Promise) {
      return result.then(
        (val) => {
          console.log('✅ [JwtAuthGuard] JWT validation succeeded');
          return val;
        },
        (err) => {
          console.error('❌ [JwtAuthGuard] JWT validation failed:', err);
          console.error('❌ [JwtAuthGuard] Error message:', err?.message);
          throw err;
        }
      );
    }
    
    if (result instanceof Observable) {
      return result.pipe(
        tap(() => console.log('✅ [JwtAuthGuard] JWT validation succeeded')),
        catchError((err) => {
          console.error('❌ [JwtAuthGuard] JWT validation failed:', err);
          console.error('❌ [JwtAuthGuard] Error message:', err?.message);
          return throwError(() => err);
        })
      );
    }
    
    return result;
  }
}
