import express from 'express';
const routes = express.Router();

import configrationController from '../../../controllers/adminpanel/appConfiguration/country.controller.js';
import {
  adminPanelAuth,
  adminPanelAuthWithoutPermission,
} from '../../../middleware/adminPanelAuth.js';

routes.post('/add', adminPanelAuth, configrationController.addCountry);
routes.put('/update', adminPanelAuth, configrationController.updateCountry);
routes.delete('/delete', adminPanelAuth, configrationController.deleteCountry);
routes.get(
  '/get',
  // adminPanelAuthWithoutPermission,
  configrationController.getCountry
);

export default routes;
