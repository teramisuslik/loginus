// Скрипт для проверки реферальных связей
// Выполняется в контейнере бэкенда

const { execSync } = require('child_process');

// SQL запрос для проверки реферальных связей
const sql = `
SELECT 
    u.email as referrer_email,
    r.code,
    r.usage_count,
    u2.email as referred_email,
    r.metadata->'usageHistory' as usage_history
FROM referrals r
JOIN users u ON r.referrer_id = u.id
LEFT JOIN users u2 ON r.referred_user_id = u2.id
WHERE u.email = 'teramisuslik' OR u2.email IN ('234523423@mail.ru', '18231@mail.ru')
ORDER BY r.created_at DESC;
`;

console.log('Проверка реферальных связей...');
console.log('SQL запрос:', sql);

