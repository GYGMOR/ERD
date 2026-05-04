const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('Init1234', 10));
