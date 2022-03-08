const fs = require('fs');
const idl = require('./target/idl/akura.json');

fs.writeFileSync('./app/public/idl.json', JSON.stringify(idl));
