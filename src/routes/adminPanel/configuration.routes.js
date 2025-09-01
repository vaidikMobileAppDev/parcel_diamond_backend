import express from 'express';
const routes = express.Router();

import configrationController from '../../controllers/adminpanel/configuration.controller.js';
import { adminPanelAuth } from '../../middleware/adminPanelAuth.js';

routes.post(
  '/role/add',
  adminPanelAuth,
  configrationController.addConfigrationRole
);
routes.put(
  '/role/update',
  adminPanelAuth,
  configrationController.updateConfigrationRole
);
routes.delete(
  '/role/delete',
  adminPanelAuth,
  configrationController.deleteConfigrationRole
);
routes.get(
  '/role/get',
  adminPanelAuth,
  configrationController.getConfigrationRole
);

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
routes.delete(
  '/price/delete',
  adminPanelAuth,
  configrationController.deleteConfigrationGlobalPrice
);
export default routes;
