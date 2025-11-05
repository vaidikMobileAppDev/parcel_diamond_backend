import express from 'express';
const routes = express.Router();

import configrationController from '../../../controllers/adminpanel/appConfiguration/color.controller.js';
import {
  adminPanelAuth,
  adminPanelAuthWithoutPermission,
} from '../../../middleware/adminPanelAuth.js';

routes.post('/add', adminPanelAuth, configrationController.addColor);
routes.put('/update', adminPanelAuth, configrationController.updateColor);
routes.delete('/delete', adminPanelAuth, configrationController.deleteColor);
routes.get(
  '/get',
  // adminPanelAuthWithoutPermission,
  configrationController.getColor
);

export default routes;
