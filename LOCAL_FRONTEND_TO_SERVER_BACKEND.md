# Инструкция: Подключение локального фронтенда к бэкенду на сервере

## Вариант 1: Прямое подключение через API URL (самый простой)

### Шаг 1: Определите URL бэкенда

Бэкенд доступен по адресу:
```
https://vselena.ldmco.ru/api
```

Или через прямой порт (если он открыт):
```
http://45.144.176.42:3001/api
```

### Шаг 2: Настройте API URL в вашем фронтенде

В вашем коде фронтенда определите базовый URL для API:

**Для React/Vue/Angular и других фреймворков:**

```javascript
// Создайте файл config.js или .env
export const API_BASE_URL = 'https://vselena.ldmco.ru/api';

// Или используйте переменные окружения:
// REACT_APP_API_URL=https://vselena.ldmco.ru/api
// VUE_APP_API_URL=https://vselena.ldmco.ru/api
```

**Для обычного JavaScript/HTML:**

```javascript
const API_BASE_URL = 'https://vselena.ldmco.ru/api';
```

### Шаг 3: Используйте API URL в запросах

```javascript
// Пример fetch запроса
fetch(`${API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password })
})
```

### Шаг 4: Настройка CORS (если необходимо)

Если возникают ошибки CORS, нужно убедиться, что бэкенд разрешает запросы с вашего локального домена:

1. Бэкенд уже должен быть настроен на разрешение запросов с любых доменов (включая localhost)
2. Если CORS ошибки все равно возникают, обратитесь к администратору для настройки

---

## Вариант 2: Использование прокси для разработки (рекомендуется)

Если вы используете фреймворк с dev-сервером (React, Vue, Angular, Vite и т.д.), настройте прокси.

### Для React (Create React App):

Создайте файл `package.json` с прокси:

```json
{
  "name": "your-frontend",
  "version": "1.0.0",
  "proxy": "https://vselena.ldmco.ru"
}
```

Или создайте файл `setupProxy.js`:

```javascript
// src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://vselena.ldmco.ru',
      changeOrigin: true,
      secure: true,
    })
  );
};
```

Теперь в коде используйте относительные пути:
```javascript
fetch('/api/auth/login', { ... })
```

### Для Vite:

Создайте `vite.config.js`:

```javascript
export default {
  server: {
    proxy: {
      '/api': {
        target: 'https://vselena.ldmco.ru',
        changeOrigin: true,
        secure: true,
      }
    }
  }
}
```

### Для Vue CLI:

Создайте `vue.config.js`:

```javascript
module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'https://vselena.ldmco.ru',
        changeOrigin: true,
        secure: true,
      }
    }
  }
}
```

### Для Angular:

Отредактируйте `proxy.conf.json`:

```json
{
  "/api": {
    "target": "https://vselena.ldmco.ru",
    "secure": true,
    "changeOrigin": true
  }
}
```

И запускайте с флагом:
```bash
ng serve --proxy-config proxy.conf.json
```

---

## Вариант 3: Использование переменных окружения

Создайте файл `.env` в корне проекта:

```env
API_BASE_URL=https://vselena.ldmco.ru/api
```

И используйте в коде:

```javascript
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
```

---

## Проверка подключения

Протестируйте подключение:

```javascript
// Простой тест
fetch('https://vselena.ldmco.ru/api/auth/me', {
  headers: {
    'Authorization': `Bearer YOUR_TOKEN`
  }
})
.then(res => res.json())
.then(data => console.log('Connected!', data))
.catch(err => console.error('Connection error:', err));
```

---

## Пример полной настройки для нового проекта

### 1. Создайте конфигурационный файл

**`src/config/api.js`** или **`src/utils/api.js`**:

```javascript
// Автоматическое определение API URL
export const API_BASE_URL = (() => {
  // В режиме разработки - используем серверный бэкенд
  if (process.env.NODE_ENV === 'development') {
    return process.env.REACT_APP_API_URL || 'https://vselena.ldmco.ru/api';
  }
  
  // В продакшене - используем тот же домен
  return window.location.origin + '/api';
})();

// Универсальная функция для API запросов
export async function apiCall(endpoint, options = {}) {
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  // Добавляем токен если есть
  const token = localStorage.getItem('authToken');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  return response.json();
}
```

### 2. Используйте в компонентах

```javascript
import { apiCall } from './utils/api';

// Пример входа
async function login(email, password) {
  try {
    const response = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    localStorage.setItem('authToken', response.accessToken);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}
```

---

## Возможные проблемы и решения

### Проблема: CORS ошибки

**Решение:** 
- Убедитесь, что бэкенд настроен на разрешение запросов с вашего домена
- Используйте прокси для разработки (Вариант 2)

### Проблема: Mixed Content (HTTP на HTTPS)

**Решение:**
- Используйте HTTPS URL: `https://vselena.ldmco.ru/api`
- Не используйте `http://45.144.176.42:3001/api` из HTTPS страницы

### Проблема: SSL сертификаты

**Решение:**
- Если возникают проблемы с SSL, используйте прокси
- Для Node.js можно временно отключить проверку: `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'` (только для разработки!)

---

## Контакты для поддержки

Если возникли проблемы с подключением:
1. Проверьте, что сервер доступен: `curl https://vselena.ldmco.ru/api/auth/me`
2. Проверьте логи бэкенда
3. Обратитесь к администратору сервера

---

## Полезные ссылки

- API документация: `https://vselena.ldmco.ru/api/docs` (Swagger, если настроен)
- Основной сайт: `https://vselena.ldmco.ru`
- Сервер: `45.144.176.42`

