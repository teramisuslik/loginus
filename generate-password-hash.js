const bcrypt = require('bcrypt');

async function generateHash() {
    const password = 'Admin123!';
    const saltRounds = 12;
    
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Password:', password);
    console.log('Hash:', hash);
    
    // Проверяем, что хэш работает
    const isValid = await bcrypt.compare(password, hash);
    console.log('Valid:', isValid);
}

generateHash();
