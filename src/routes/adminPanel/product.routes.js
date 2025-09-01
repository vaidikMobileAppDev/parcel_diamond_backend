import express from 'express';
const routes = express.Router();

import productController from '../../controllers/adminpanel/product.controller.js';
import { adminPanelAuth } from '../../middleware/adminPanelAuth.js';

routes.post('/diamond/add', adminPanelAuth, productController.addDiamonds);
routes.get('/diamond/get', adminPanelAuth, productController.getDiamonds);
routes.get(
  '/diamond/qr-code/get',
  adminPanelAuth,
  productController.getDiamondsQRCodes
);
routes.delete(
  '/diamond/delete',
  adminPanelAuth,
  productController.deleteDiamonds
);
routes.put(
  '/diamond/store/active-inactive',
  adminPanelAuth,
  productController.updateStoreDiamondsActiveInactive
);

routes.get(
  '/history/get',
  adminPanelAuth,
  productController.getPurchaseHistory
);
export default routes;
