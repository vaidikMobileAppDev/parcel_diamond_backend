import express from 'express';
const routes = express.Router();

import authRoutes from './auth.routes.js';
routes.use('/auth', authRoutes);

export default routes;
