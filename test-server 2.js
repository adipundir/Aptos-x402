// Quick test to check if server is running
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/protected/weather',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:');
    console.log(data);
    
    if (res.statusCode === 402) {
      console.log('✅ Server is running correctly - got 402 as expected');
    } else if (res.statusCode === 500) {
      console.log('❌ Server error - check server logs');
    } else {
      console.log(`⚠️  Unexpected status: ${res.statusCode}`);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Connection failed: ${e.message}`);
  console.log('💡 Make sure to run: npm run dev');
});

req.end();
