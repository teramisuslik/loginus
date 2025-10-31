const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'admin123';
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(password, salt);
  console.log(`Hash for password "${password}":`);
  console.log(hash);
}

generateHash();

