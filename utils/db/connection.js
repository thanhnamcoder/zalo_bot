const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const YAML = require('yaml');

const configPath = path.join(__dirname, '..', '..', 'config.yml');
const config = YAML.parse(fs.readFileSync(configPath, 'utf8'));
const database = config.database || {};

const pool = mysql.createPool({
  host: database.host,
  port: Number(database.port),
  user: database.user,
  password: database.password,
  database: database.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;