const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTest() {
  const username = 'test_user_' + Math.floor(Math.random() * 100000);
  const password = 'Password123!';
  
  console.log(`[1] Registering test user: ${username}`);
  const regRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username, password });
  
  if (regRes.status !== 200) {
    console.error('Registration failed:', regRes.body);
    process.exit(1);
  }
  
  const token = regRes.body.token;
  console.log('Registration success. Token acquired.');

  const authHeaders = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  console.log('\n[2] Fetching daily-puzzle...');
  const dpRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/math/daily-puzzle',
    method: 'GET',
    headers: authHeaders
  });
  console.log('Status:', dpRes.status);
  console.log('Body keys:', Object.keys(dpRes.body));

  console.log('\n[3] Toggling favorite...');
  const favToggleRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/favorites/toggle',
    method: 'POST',
    headers: authHeaders
  }, {
    title: 'Test Exercise',
    category: 'algebra',
    question: 'x^2 + 2x + 1 = 0',
    correct_answer: 'x = -1',
    options: ['x = -1', 'x = 1', 'x = 0'],
    explanation: 'Factoring gives (x+1)^2 = 0'
  });
  console.log('Status:', favToggleRes.status);
  console.log('Response:', favToggleRes.body);

  console.log('\n[4] Getting favorites list...');
  const favListRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/favorites',
    method: 'GET',
    headers: authHeaders
  });
  console.log('Status:', favListRes.status);
  console.log('Favorites count:', favListRes.body.length);
  if (favListRes.body.length > 0) {
    console.log('First favorite:', favListRes.body[0]);
  }

  console.log('\n[5] Getting notifications...');
  const notifRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/notifications',
    method: 'GET',
    headers: authHeaders
  });
  console.log('Status:', notifRes.status);
  console.log('Notifications:', notifRes.body);

  console.log('\n[6] Marking notification read...');
  const firstNotifId = notifRes.body[0]?.id;
  if (firstNotifId) {
    const readRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/notifications/read',
      method: 'POST',
      headers: authHeaders
    }, { notificationId: firstNotifId });
    console.log('Status:', readRes.status);
    console.log('Response:', readRes.body);
  }

  console.log('\n[7] Getting daily activity/commitment status...');
  const commRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/commitment/status',
    method: 'GET',
    headers: authHeaders
  });
  console.log('Status:', commRes.status);
  console.log('Commitment keys:', Object.keys(commRes.body));
  console.log('Activity days:', commRes.body.activityDays);

  console.log('\nAll server tests executed successfully!');
}

runTest().catch(console.error);
