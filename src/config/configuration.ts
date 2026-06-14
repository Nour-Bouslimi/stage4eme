export default () => ({
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'changeme',
  DATABASE: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'nour',
    database: process.env.DB_NAME || 'stage4eme',
  },
});
