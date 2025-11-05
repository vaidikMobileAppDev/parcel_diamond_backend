import express from 'express';
const routes = express.Router();

import configrationController from '../../../controllers/adminpanel/appConfiguration/shape.controller.js';
import {
  adminPanelAuth,
  adminPanelAuthWithoutPermission,
} from '../../../middleware/adminPanelAuth.js';

routes.post('/add', adminPanelAuth, configrationController.addShape);
routes.put('/update', adminPanelAuth, configrationController.updateShape);
routes.delete('/delete', adminPanelAuth, configrationController.deleteShape);
routes.get(
  '/get',
  // adminPanelAuthWithoutPermission,
  configrationController.getShape
);

export default routes;
