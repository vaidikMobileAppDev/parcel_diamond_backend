import express from 'express';
const routes = express.Router();

import pricePerCaratRegionController from '../../../controllers/adminpanel/appConfiguration/pricePerCaratRegion.controller.js';
import {
  adminPanelAuth,
  adminPanelAuthWithoutPermission,
} from '../../../middleware/adminPanelAuth.js';

routes.post(
  '/add',
  adminPanelAuth,
  pricePerCaratRegionController.addPricePerCaratRegion
);
routes.post(
  '/bulk',
  adminPanelAuth,
  pricePerCaratRegionController.bulkPricePerCaratRegion
);
routes.put(
  '/update',
  adminPanelAuth,
  pricePerCaratRegionController.updatePricePerCaratRegion
);
routes.delete(
  '/delete',
  adminPanelAuth,
  pricePerCaratRegionController.deletePricePerCaratRegion
);
routes.get(
  '/get',
    adminPanelAuth,
  pricePerCaratRegionController.getPricePerCaratRegion
);
routes.get(
  '/get-all-price-per-carat-region',
    adminPanelAuth,
  pricePerCaratRegionController.getAllPricePerCTRegion
);

export default routes;
