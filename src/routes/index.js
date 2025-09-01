import express from 'express';
const routes = express.Router();

import adminRoutes from './adminPanel/index.js';
routes.use('/admin', adminRoutes);

import customerRoutes from './customerPanel/index.js';
routes.use('/customer', customerRoutes);

export default routes;
