import express from 'express';
const routes = express.Router();

import configrationController from '../../../controllers/adminpanel/appConfiguration/sieve_size.controller.js';
import {
  adminPanelAuth,
  adminPanelAuthWithoutPermission,
} from '../../../middleware/adminPanelAuth.js';

routes.post('/add', adminPanelAuth, configrationController.addSieveSize);
routes.put('/update', adminPanelAuth, configrationController.updateSieveSize);
routes.delete(
  '/delete',
  adminPanelAuth,
  configrationController.deleteSieveSize
);
routes.get(
  '/get',
  // adminPanelAuthWithoutPermission,
  configrationController.getSieveSize
);

export default routes;
