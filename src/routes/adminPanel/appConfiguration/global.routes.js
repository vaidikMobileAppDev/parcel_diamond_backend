import express from 'express';
const routes = express.Router();

import configrationController from '../../../controllers/adminpanel/appConfiguration/global.controller.js';
import {
  adminPanelAuth,
  adminPanelAuthWithoutPermission,
} from '../../../middleware/adminPanelAuth.js';

routes.post(
  '/price/add',
  adminPanelAuth,
  configrationController.addConfigrationGlobalPrice
);
routes.put(
  '/price/update',
  adminPanelAuth,
  configrationController.updateConfigrationGlobalPrice
);
routes.put(
  '/price/set-default',
  adminPanelAuth,
  configrationController.setGlobalPriceDefault
);
routes.delete(
  '/price/delete',
  adminPanelAuth,
  configrationController.deleteConfigrationGlobalPrice
);
routes.get(
  '/price/get',
  adminPanelAuthWithoutPermission,
  configrationController.getConfigrationGlobalPrice
);
export default routes;
