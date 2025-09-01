import dotenv from 'dotenv';

dotenv.config();

export default {
  port: process.env.PORT || 3000,
  database: {
    name: process.env.MYSQL_DATABASE || 'parcel_diamonds',
    user: process.env.MYSQL_USER || 'postgres',
    password: process.env.MYSQL_PASSWORD || 'admin',
    host: process.env.MYSQL_HOST || 'localhost',
    dialect: process.env.MYSQL_DAILECT || 'postgres',
    port: process.env.MYSQL_PORT || 5432,
  },
  bcrypt: {
    salt: process.env.SALT || 10,
  },
  email: {
    username: process.env.EMAIL_USERNAME,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'secret',
    refreshTokenExpireTime: process.env.JWT_REFRESH_TOKEN_EXPIRE || '30d',
    accessTokenExpireTime: process.env.JWT_ACCESS_TOKEN_EXPIRE || '1d',
  },
  bucket: {
    name: process.env.AWS_BUCKET_NAME,
    region: process.env.AWS_BUCKET_REGION,
    accessKey: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    url: process.env.AWS_BUCKET_URL,
  },
};
