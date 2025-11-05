import express from 'express';
const routes = express.Router();

import cartController from '../../controllers/customer/cart.controller.js';
import {
  customerAuth,
  customerAuthwithOptionaltoken,
} from '../../middleware/customerAuth.js';

routes.get(
  '/get-cart-list',
  customerAuth,
  cartController.getAllCartList
);

export default routes;
