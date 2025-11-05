import express from 'express';
const routes = express.Router();

import configrationController from '../../../controllers/adminpanel/appConfiguration/customer_masters.controller.js';
import {
  adminPanelAuth,
  adminPanelAuthWithoutPermission,
} from '../../../middleware/adminPanelAuth.js';

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

export default routes;
