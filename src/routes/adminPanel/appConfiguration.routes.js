import express from 'express';
const routes = express.Router();

import appConfigurationController from '../../controllers/adminpanel/appConfiguration.controller.js';
import { adminPanelAuthWithoutPermission } from '../../middleware/adminPanelAuth.js';

routes.get(
  '/sieve-size/get',
  adminPanelAuthWithoutPermission,
  appConfigurationController.getSieveSize
);
routes.get(
  '/country/get',
  adminPanelAuthWithoutPermission,
  appConfigurationController.getCountry
);
routes.get(
  '/color/get',
  adminPanelAuthWithoutPermission,
  appConfigurationController.getColor
);
routes.get(
  '/shape/get',
  adminPanelAuthWithoutPermission,
  appConfigurationController.getShape
);
routes.get(
  '/clarity/get',
  adminPanelAuthWithoutPermission,
  appConfigurationController.getClarity
);

export default routes;
