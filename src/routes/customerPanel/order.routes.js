import express from 'express';
const routes = express.Router();

import orderController from '../../controllers/customer/order.controller.js';
import {
  customerAuth,
  customerAuthwithOptionaltoken,
} from '../../middleware/customerAuth.js';

routes.post(
  '/place-order',
  customerAuth,
  orderController.placeOrder
);

routes.get(
  '/get-all-orders',
  customerAuth,
  orderController.getAllOrders
);

routes.post(
  '/get-shipping-charge',
  customerAuth,
  orderController.getShippingCharges
);

routes.get(
  '/details/:id',
  customerAuth,
  orderController.getOrderDetails
);

routes.post(
  '/order-cancel',
  customerAuth,
  orderController.OrderCancel
);

export default routes;
