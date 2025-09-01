// logger.js
const fs = require('fs');
const path = require('path');

// log file path
const logFile = path.join(__dirname, 'logs.txt');

function logger(req, res, next) {
  const user = req.user ? req.user.id : 'Guest'; // assuming you attach user info after auth
  const logEntry = {
    user,
    method: req.method,
    baseUrl: req.baseUrl,
    url: req.originalUrl,
    payload: req.body,
    query: req.query,
    params: req.params,
    timestamp: new Date().toISOString(),
  };

  const logLine = JSON.stringify(logEntry) + '\n';

  // append to file
  fs.appendFile(logFile, logLine, (err) => {
    if (err) console.error('Logging error:', err);
  });

  console.log(logEntry); // also print to console for debugging
  next();
}

module.exports = logger;
