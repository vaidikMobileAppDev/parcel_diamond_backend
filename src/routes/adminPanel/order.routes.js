import express from 'express';
const routes = express.Router();

import orderController from '../../controllers/adminpanel/order.controller.js';
import { adminPanelAuth } from '../../middleware/adminPanelAuth.js';

routes.get(
  '/get-all-orders',
  adminPanelAuth,
  orderController.getAllOrders
);

routes.get(
  '/details',
  adminPanelAuth,
  orderController.getOrderDetails
);

routes.post(
  '/manage-order-status',
  adminPanelAuth,
  orderController.manageOrderStatus
);

export default routes;
