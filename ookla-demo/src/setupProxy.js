const proxy = require('http-proxy-middleware');
module.exports = function(app) {
  app.use('/api/js/servers', proxy({ target: 'https://account.speedtestcustom.com', changeOrigin: true, }));
  app.use('/api/results.php', proxy({ target: 'https://account.speedtestcustom.com', changeOrigin: true, }));
};
