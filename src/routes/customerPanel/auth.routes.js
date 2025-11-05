import express from 'express';
const routes = express.Router();

import authController from '../../controllers/customer/auth.controller.js';

routes.post('/register', authController.register);

routes.post('/signup', authController.signupCustomer);
routes.post('/signin', authController.signinCustomer);
routes.post('/signin/verify-otp', authController.verifyCustomerSigninOtp);

export default routes;
