import http from 'http';

http.get('http://localhost:9250/css/auth.css', (res) => {
  console.log('GET /css/auth.css status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('auth.css length:', data.length);
    process.exit(0);
  });
}).on('error', (err) => {
  console.error('Request error:', err.message);
  process.exit(1);
});
