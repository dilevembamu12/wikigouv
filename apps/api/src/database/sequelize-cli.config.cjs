require('dotenv').config({ path: require('path').resolve(process.cwd(), '..', '..', '.env') });

const base = {
  username: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'wikigouv',
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  dialect: 'mysql',
  logging: false
};

module.exports = {
  development: base,
  test: base,
  production: base
};
