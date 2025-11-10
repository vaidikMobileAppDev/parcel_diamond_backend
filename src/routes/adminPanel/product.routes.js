import express from 'express';
const routes = express.Router();

import productController from '../../controllers/adminpanel/product.controller.js';
import { adminPanelAuth } from '../../middleware/adminPanelAuth.js';

routes.post('/diamond/add', adminPanelAuth, productController.addDiamond);
routes.get('/diamond/get', adminPanelAuth, productController.getDiamonds);
routes.get(
  '/diamond/qr-code/get',
  adminPanelAuth,
  productController.getDiamondsQRCodes
);
routes.get(
  '/diamond/qr-code/scan',
  adminPanelAuth,
  productController.scanDiamondQRCode
);
routes.delete(
  '/diamond/delete',
  adminPanelAuth,
  productController.deleteDiamond
);
routes.get(
  '/diamond/store-get',
  adminPanelAuth,
  productController.getDiamondsGroupedByGrade
);
routes.post(
  '/diamond/store/active',
  adminPanelAuth,
  productController.allocatePacketsForStore
);
routes.post(
  '/diamond/store/inactive',
  adminPanelAuth,
  productController.deallocatePacketsFromStore
);
routes.post(
  '/diamond/store/alloc-dealloc-excel',
  adminPanelAuth,
  productController.allocDeallocPacketsExcel
);
routes.put(
  '/diamond/lot/unpack',
  adminPanelAuth,
  productController.unpackDiamondsLot
);
routes.get(
  '/history/get',
  adminPanelAuth,
  productController.getPurchaseHistory
);
routes.get(
  '/diamond/list-excel',
  adminPanelAuth,
  productController.getDiamondsForExcel
);
export default routes;
