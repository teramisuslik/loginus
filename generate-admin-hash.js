const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'admin123';
  const saltRounds = 12;
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('Password:', password);
  console.log('Hash:', hash);
  
  // Проверим, что хеш правильный
  const isValid = await bcrypt.compare(password, hash);
  console.log('Is valid:', isValid);
}

generateHash().catch(console.error);
