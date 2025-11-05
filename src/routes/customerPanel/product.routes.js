import express from 'express';
const routes = express.Router();

import productController from '../../controllers/customer/product.controller.js';
import {
  customerAuth,
  customerAuthwithOptionaltoken,
} from '../../middleware/customerAuth.js';

// Get diamond packets available for store
routes.get(
  '/diamond/store/get/:id',
  customerAuthwithOptionaltoken,
  productController.getStoreAvailablePacketById
);

// Get diamond lots with packets available for store
routes.get(
  '/diamond/store/get',
  customerAuthwithOptionaltoken,
  productController.getStoreAvailablePackets
);

routes.post(
  '/diamond/wishlist/toggle',
  customerAuth,
  productController.toggleCustomerWishlist
);

routes.post(
  '/diamond/cart/add',
  customerAuth,
  productController.addOrUpdateCartItem
);

routes.put(
  '/diamond/cart/remove',
  customerAuth,
  productController.removeCartItem
);

export default routes;
