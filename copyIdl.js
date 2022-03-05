const fs = require('fs');
const idl = require('./target/idl/akura.json');

fs.writeFileSync('./app/src/idl.json', JSON.stringify(idl));
