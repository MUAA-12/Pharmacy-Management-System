const assert = require('node:assert/strict');
const {convert} = require('../config/pgAdapter');
assert.match(convert("SELECT DATE_FORMAT(r.reservation_date, '%Y-%m-%d %H:%i') FROM reservations r").text, /TO_CHAR\(r.reservation_date, 'YYYY-MM-DD HH24:MI'\)/);
assert.match(convert('SELECT DATEDIFF(expiry_date, CURRENT_DATE()) FROM medicines').text, /expiry_date - CURRENT_DATE/);
assert.match(convert('SELECT CAST(r.reservation_id AS CHAR) FROM reservations r').text, /CAST\(r.reservation_id AS TEXT\)/);
assert.match(convert('SELECT * FROM medicines WHERE medicine_id = ?', [1]).text, /medicine_id = \$1/);
console.log('SQL adapter tests passed');
