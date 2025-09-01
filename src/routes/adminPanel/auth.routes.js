import express from 'express';
const routes = express.Router();

import authController from '../../controllers/adminpanel/auth.controller.js';

routes.post('/login', authController.login);

export default routes;
