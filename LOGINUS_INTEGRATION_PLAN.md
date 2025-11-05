# План интеграции Loginus с AI Aggregator

## Обзор

Интеграция внешнего сервиса авторизации Loginus (https://vselena.ldmco.ru) для единой точки входа в AI Aggregator.

## Архитектура интеграции

```
[Frontend] → [API Gateway] → [Loginus OAuth] → [Callback] → [API Gateway] → [Auth Service] → [JWT Token]
```

## Endpoints для Loginus

### 1. OAuth Authorization Endpoint
**URL:** `GET /oauth/authorize`

**Параметры запроса:**
- `client_id` (string, required) - ID клиента AI Aggregator в Loginus
- `redirect_uri` (string, required) - URI для редиректа после авторизации (например: `http://localhost:80/auth/callback`)
- `response_type` (string, required) - тип ответа (`code` для Authorization Code flow)
- `scope` (string, optional) - запрашиваемые разрешения (например: `openid email profile`)
- `state` (string, optional) - случайная строка для защиты от CSRF

**Пример запроса:**
```
GET https://vselena.ldmco.ru/oauth/authorize?client_id=ai-aggregator&redirect_uri=http://localhost:80/auth/callback&response_type=code&scope=openid%20email%20profile&state=random_state_string
```

**Ответ:**
- Редирект на страницу авторизации Loginus
- После успешной авторизации - редирект на `redirect_uri` с параметрами:
  - `code` - authorization code
  - `state` - тот же state, что был отправлен

---

### 2. OAuth Token Exchange Endpoint
**URL:** `POST /oauth/token`

**Параметры запроса (application/x-www-form-urlencoded):**
- `grant_type` (string, required) - `authorization_code`
- `code` (string, required) - authorization code из callback
- `redirect_uri` (string, required) - тот же redirect_uri, что использовался в authorize
- `client_id` (string, required) - ID клиента
- `client_secret` (string, required) - секретный ключ клиента

**Пример запроса:**
```http
POST /oauth/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=abc123&redirect_uri=http://localhost:80/auth/callback&client_id=ai-aggregator&client_secret=secret_key
```

**Ответ:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token_here",
  "id_token": "jwt_token_with_user_info"
}
```

---

### 3. User Info Endpoint
**URL:** `GET /oauth/userinfo`

**Headers:**
- `Authorization: Bearer {access_token}`

**Пример запроса:**
```http
GET /oauth/userinfo HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ответ:**
```json
{
  "id": "user_id_in_loginus",
  "email": "user@example.com",
  "firstName": "Иван",
  "lastName": "Иванов",
  "phone": "+79991234567",
  "isVerified": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### 4. OAuth Logout Endpoint (опционально)
**URL:** `POST /oauth/logout`

**Параметры:**
- `token` (string, required) - access_token или refresh_token для инвалидации
- `redirect_uri` (string, optional) - куда перенаправить после выхода

**Ответ:**
- Редирект на указанный `redirect_uri` или подтверждение выхода

---

## Реализация в AI Aggregator

### Шаг 1: Добавить OAuth конфигурацию в API Gateway

**Файл:** `services/api-gateway/src/config/configuration.ts`

Добавить:
```typescript
loginus: {
  oauthUrl: process.env.LOGINUS_OAUTH_URL || 'https://vselena.ldmco.ru',
  clientId: process.env.LOGINUS_CLIENT_ID,
  clientSecret: process.env.LOGINUS_CLIENT_SECRET,
  redirectUri: process.env.LOGINUS_REDIRECT_URI || 'http://localhost:80/auth/callback',
  scope: process.env.LOGINUS_SCOPE || 'openid email profile',
}
```

### Шаг 2: Создать OAuth Controller в API Gateway

**Файл:** `services/api-gateway/src/auth/oauth.controller.ts`

```typescript
import { Controller, Get, Query, Res, Req, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Controller('auth')
export class OAuthController {
  private readonly loginusOAuthUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly scope: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly httpService: HttpService,
  ) {
    this.loginusOAuthUrl = this.configService.get('LOGINUS_OAUTH_URL', 'https://vselena.ldmco.ru');
    this.clientId = this.configService.get('LOGINUS_CLIENT_ID');
    this.clientSecret = this.configService.get('LOGINUS_CLIENT_SECRET');
    this.redirectUri = this.configService.get('LOGINUS_REDIRECT_URI', 'http://localhost:80/auth/callback');
    this.scope = this.configService.get('LOGINUS_SCOPE', 'openid email profile');
  }

  @Get('loginus')
  async initiateLoginus(@Res() res: Response, @Req() req: any) {
    // Генерируем state для защиты от CSRF
    const state = crypto.randomBytes(32).toString('hex');
    
    // Сохраняем state в сессии или cookie (для упрощения используем cookie)
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600000, // 10 минут
    });

    // Формируем URL для редиректа на Loginus
    const authUrl = new URL(`${this.loginusOAuthUrl}/oauth/authorize`);
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', this.scope);
    authUrl.searchParams.set('state', state);

    return res.redirect(authUrl.toString());
  }

  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
    @Req() req: any,
  ) {
    // Проверяем наличие ошибки
    if (error) {
      return res.redirect(`/?error=${encodeURIComponent(error)}`);
    }

    // Проверяем state (защита от CSRF)
    const storedState = req.cookies?.oauth_state;
    if (!storedState || storedState !== state) {
      return res.redirect('/?error=invalid_state');
    }

    // Очищаем cookie
    res.clearCookie('oauth_state');

    if (!code) {
      return res.redirect('/?error=no_code');
    }

    try {
      // Обмениваем код на токен
      const tokenResponse = await firstValueFrom(
        this.httpService.post(
          `${this.loginusOAuthUrl}/oauth/token`,
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: this.redirectUri,
            client_id: this.clientId,
            client_secret: this.clientSecret,
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        )
      );

      const { access_token, id_token } = tokenResponse.data;

      // Получаем информацию о пользователе
      const userInfoResponse = await firstValueFrom(
        this.httpService.get(`${this.loginusOAuthUrl}/oauth/userinfo`, {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        })
      );

      const userInfo = userInfoResponse.data;

      // Синхронизируем пользователя в нашем auth-service
      // Ищем пользователя по email или создаем нового
      const jwtToken = await this.authService.syncUserFromLoginus(userInfo);

      // Редиректим на frontend с токеном
      return res.redirect(`/?token=${jwtToken}&success=true`);
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      return res.redirect(`/?error=${encodeURIComponent(error.message || 'oauth_failed')}`);
    }
  }
}
```

### Шаг 3: Добавить метод синхронизации в AuthService

**Файл:** `services/api-gateway/src/auth/auth.service.ts`

Добавить метод:
```typescript
async syncUserFromLoginus(userInfo: any): Promise<string> {
  try {
    // Проверяем, существует ли пользователь в нашей системе
    const checkResponse = await firstValueFrom(
      this.httpService.get(`${this.authServiceUrl}/auth/user/by-email/${userInfo.email}`)
    ).catch(() => null);

    let user;
    if (checkResponse?.data) {
      // Пользователь существует - обновляем информацию
      user = checkResponse.data;
    } else {
      // Пользователь не существует - создаем нового
      const registerData = {
        email: userInfo.email,
        password: crypto.randomBytes(32).toString('hex'), // Генерируем случайный пароль
        firstName: userInfo.firstName || '',
        lastName: userInfo.lastName || '',
      };

      const registerResponse = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/auth/register`, registerData)
      );

      user = registerResponse.data.company;
    }

    // Генерируем JWT токен для нашего сервиса
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const jwt = require('jsonwebtoken');
    
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role || 'user',
        type: 'company',
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    return token;
  } catch (error: any) {
    throw new HttpException('Failed to sync user from Loginus', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
```

### Шаг 4: Обновить Frontend

**Файл:** `frontend/src/App.js`

Изменить кнопку "Вход/Регистрация":

```javascript
{!user ? (
  <button 
    className={currentView === 'auth' ? 'active' : ''}
    onClick={() => {
      // Редирект на API Gateway для инициации OAuth
      window.location.href = '/v1/auth/loginus';
    }}
  >
    <LogIn size={20} /> Вход/Регистрация
  </button>
) : (
  // ... остальной код
)}
```

Добавить обработку токена из URL параметров в useEffect:

```javascript
useEffect(() => {
  // Проверяем наличие токена в URL (после OAuth callback)
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const error = urlParams.get('error');
  const success = urlParams.get('success');

  if (token && success) {
    // Сохраняем токен
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Получаем информацию о пользователе
    fetchUserData(token);
    
    // Очищаем URL
    window.history.replaceState({}, document.title, '/');
  } else if (error) {
    showError(decodeURIComponent(error));
    // Очищаем URL
    window.history.replaceState({}, document.title, '/');
  }
}, []);
```

### Шаг 5: Обновить Auth Module

**Файл:** `services/api-gateway/src/auth/auth.module.ts`

Добавить OAuthController:
```typescript
import { OAuthController } from './oauth.controller';

@Module({
  // ...
  controllers: [AuthController, OAuthController],
  // ...
})
export class AuthModule {}
```

### Шаг 6: Добавить cookie-parser

**Файл:** `services/api-gateway/src/main.ts`

```typescript
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  // ...
  app.use(cookieParser());
  // ...
}
```

### Шаг 7: Обновить docker-compose.yml

Добавить переменные окружения для OAuth:
```yaml
api-gateway:
  environment:
    # ... существующие переменные
    - LOGINUS_OAUTH_URL=https://vselena.ldmco.ru
    - LOGINUS_CLIENT_ID=your_client_id
    - LOGINUS_CLIENT_SECRET=your_client_secret
    - LOGINUS_REDIRECT_URI=http://localhost:80/auth/callback
    - LOGINUS_SCOPE=openid email profile
```

## Flow интеграции

1. Пользователь нажимает "Вход/Регистрация" в frontend
2. Frontend делает редирект на `GET /v1/auth/loginus`
3. API Gateway генерирует state и редиректит на Loginus OAuth
4. Пользователь авторизуется в Loginus (Email, Telegram, GitHub и т.д.)
5. Loginus редиректит обратно на `GET /v1/auth/callback?code=...&state=...`
6. API Gateway проверяет state, обменивает code на access_token
7. API Gateway получает userinfo из Loginus
8. API Gateway синхронизирует пользователя в auth-service
9. API Gateway генерирует JWT токен для AI Aggregator
10. API Gateway редиректит на frontend с токеном: `/?token=...&success=true`
11. Frontend сохраняет токен и аутентифицирует пользователя

## Безопасность

1. **State параметр** - защита от CSRF атак
2. **HTTPS** - обязателен в production для передачи токенов
3. **HttpOnly cookies** - для хранения state
4. **Секретный ключ** - client_secret хранится только на сервере
5. **Валидация redirect_uri** - Loginus должен проверять, что redirect_uri зарегистрирован для клиента

## Регистрация клиента в Loginus

Перед интеграцией необходимо:
1. Зарегистрировать AI Aggregator как OAuth клиента в Loginus
2. Получить `client_id` и `client_secret`
3. Зарегистрировать `redirect_uri` (например: `http://localhost:80/auth/callback` для dev и `https://yourdomain.com/auth/callback` для production)

## Тестирование

1. Проверить редирект на Loginus
2. Проверить callback с валидным code
3. Проверить обработку ошибок (invalid_state, no_code)
4. Проверить синхронизацию нового пользователя
5. Проверить обновление существующего пользователя
6. Проверить сохранение и использование JWT токена

