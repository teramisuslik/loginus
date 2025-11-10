import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Cookie parser
  app.use(cookieParser());

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  const frontendUrl = configService.get('FRONTEND_URL', 'http://localhost:3000');
  const isDevelopment = configService.get('NODE_ENV') !== 'production';
  
  app.enableCors({
    origin: (origin, callback) => {
      // Разрешаем запросы без origin (например, с файловой системы или Postman)
      // Также разрешаем origin === "null" (браузерные запросы с null origin)
      if (!origin || origin === 'null') return callback(null, true);
      
      // В режиме разработки разрешаем все localhost и 127.0.0.1
      if (isDevelopment) {
        if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('0.0.0.0')) {
          return callback(null, true);
        }
      }
      
      const allowedOrigins = [
        frontendUrl,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:5173', // Vite default
        'http://localhost:5174', // Vite alternative
        'http://localhost:8080',
        'http://localhost:8081',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3002',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:8081',
        'https://loginus.ldmco.ru',
        'http://45.144.176.42:3000',
        'http://45.144.176.42:3002',
        'https://loginus.ldmco.ru',
        'http://loginus.ldmco.ru',
        'https://loginus.startapus.com',
        'http://loginus.startapus.com'
      ];
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Если это не в списке и не development, отклоняем
      return callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger setup
  if (configService.get('app.swaggerEnabled') !== false) {
    const config = new DocumentBuilder()
      .setTitle('Loginus API')
      .setDescription('API документация для системы управления базой знаний и поддержкой')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Введите JWT токен',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('auth', 'Аутентификация и авторизация')
      .addTag('users', 'Управление пользователями')
      .addTag('roles', 'Управление ролями')
      .addTag('permissions', 'Управление правами')
      .addTag('organizations', 'Организации')
      .addTag('teams', 'Команды')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Loginus API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = configService.get('app.port') || 3001;
  
  // Добавляем middleware для отключения кеширования API ответов ПЕРЕД listen
  // Важно: в NestJS нужно использовать интерсептор или global interceptor
  app.use((req: any, res: any, next: any) => {
    // Для всех API запросов отключаем кеширование
    if (req.path && req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
    next();
  });
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();