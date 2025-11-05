import express from 'express';
const routes = express.Router();

import configrationController from '../../../controllers/adminpanel/appConfiguration/supplier_category.controller.js';
import {
  adminPanelAuth,
  adminPanelAuthWithoutPermission,
} from '../../../middleware/adminPanelAuth.js';

routes.post('/add', adminPanelAuth, configrationController.addSupplierCategory);
routes.put(
  '/update',
  adminPanelAuth,
  configrationController.updateSupplierCategory
);
routes.delete(
  '/delete',
  adminPanelAuth,
  configrationController.deleteSupplierCategory
);
routes.get(
  '/get',
  adminPanelAuthWithoutPermission,
  configrationController.getSupplierCategory
);

export default routes;
