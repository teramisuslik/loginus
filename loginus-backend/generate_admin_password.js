const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'admin123';
  const saltRounds = 12;
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nSQL to update:');
  console.log(`UPDATE users SET "passwordHash" = '${hash}' WHERE email = 'admin@loginus.ru';`);
}

generateHash().catch(console.error);

