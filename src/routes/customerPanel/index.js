import express from 'express';
const routes = express.Router();

import authRoutes from './auth.routes.js';
routes.use('/auth', authRoutes);

import productRoutes from "./product.routes.js"
routes.use("/product",productRoutes)

import cartRoutes from "./cart.routes.js"
routes.use("/cart",cartRoutes)

import orderRoutes from "./order.routes.js"
routes.use("/order",orderRoutes)

export default routes;
