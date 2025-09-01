import { getMessage } from '../lang/message.js';

const successResponse = (res, messageCode, data, status = 200) => {
  let message = getMessage(messageCode);
  return res.status(status).json({
    status: true,
    message,
    ...(data && { data }),
  });
};

const errorResponse = (res, messageCode, error, status = 400) => {
  console.log('error', error);
  let message = getMessage(messageCode);
  return res.status(status).json({
    status: false,
    message,
    ...(error && { error: error.message ? error.message : error }),
  });
};

export { successResponse, errorResponse };
