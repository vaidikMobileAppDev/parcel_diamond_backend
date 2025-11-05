import express from 'express';
const routes = express.Router();

import configrationController from '../../../controllers/adminpanel/appConfiguration/clarity.controller.js';
import {
  adminPanelAuth,
  adminPanelAuthWithoutPermission,
} from '../../../middleware/adminPanelAuth.js';

routes.post('/add', adminPanelAuth, configrationController.addClarity);
routes.put('/update', adminPanelAuth, configrationController.updateClarity);
routes.delete('/delete', adminPanelAuth, configrationController.deleteClarity);
routes.get(
  '/get',
  // adminPanelAuthWithoutPermission,
  configrationController.getClarity
);

export default routes;
