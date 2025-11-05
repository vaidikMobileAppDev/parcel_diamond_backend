import crypto from 'crypto';

const generateRandomString = async (length = 5) => {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
};

export { generateRandomString };
