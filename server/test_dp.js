const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign({ id: 1, username: 'mk' }, 'numera_secure_jwt_secret_token_2026_defense_in_depth_xyz');
console.log('Token:', token);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/math/daily-puzzle',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response Body:', data);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});
req.end();
