// Скрипт для проверки реферальных связей через API
const http = require('http');

// 1. Авторизация
function login(email, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email, password });
    
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 2. Получение статистики рефералов
function getReferralStats(token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/referrals/stats',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// 3. Выполнение проверки
async function checkReferrals() {
  try {
    console.log('1. Авторизация как teramisuslik...');
    const loginResult = await login('teramisuslik', 'admin123');
    
    if (!loginResult.accessToken) {
      console.error('Ошибка авторизации:', loginResult);
      return;
    }
    
    console.log('✓ Авторизация успешна');
    console.log('2. Получение статистики рефералов...');
    
    const stats = await getReferralStats(loginResult.accessToken);
    
    console.log('\n=== Статистика рефералов ===');
    console.log(JSON.stringify(stats, null, 2));
    
    // Проверяем наличие нужных пользователей
    if (stats.success && stats.referrals) {
      console.log('\n=== Проверка рефералов ===');
      const referrals = stats.referrals;
      
      // Ищем в usageHistory
      referrals.forEach(ref => {
        if (ref.usageHistory && Array.isArray(ref.usageHistory)) {
          console.log(`\nКод: ${ref.code}, использований: ${ref.usageCount}`);
          ref.usageHistory.forEach((usage, idx) => {
            console.log(`  Использование ${idx + 1}: userId=${usage.userId}, usedAt=${usage.usedAt}`);
          });
        }
      });
    }
    
    // Проверяем referredUser
    if (stats.success && stats.referrals) {
      stats.referrals.forEach(ref => {
        if (ref.referredUser) {
          console.log(`\nРеферал через referredUser: ${ref.referredUser.email}`);
        }
      });
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkReferrals();

