import express from 'express';
const routes = express.Router();

import authRoutes from './auth.routes.js';
routes.use('/auth', authRoutes);

import appConfigurationRoutes from './appConfiguration.routes.js';
routes.use('/app-configuration', appConfigurationRoutes);

import employeeRoutes from './employee.routes.js';
routes.use('/employees', employeeRoutes);

import customerRoutes from './customer.routes.js';
routes.use('/customers', customerRoutes);

import configurationRoutes from './configuration.routes.js';
routes.use('/configuration--customer_masters', configurationRoutes);
routes.use('/configuration--global', configurationRoutes);
routes.use('/configuration--custom_coupon_code', configurationRoutes);

import supplierRoutes from './supplier.routes.js';
routes.use('/accounting-supplier_management--supplier_details', supplierRoutes);

import productRoutes from './product.routes.js';
routes.use('/products--product_list', productRoutes);
routes.use('/products--purchase_history', productRoutes);

export default routes;
