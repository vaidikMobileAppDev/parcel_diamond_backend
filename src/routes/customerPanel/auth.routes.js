import express from 'express';
const routes = express.Router();

import authController from '../../controllers/customer/auth.controller.js';

routes.post('/register', authController.register);

export default routes;
