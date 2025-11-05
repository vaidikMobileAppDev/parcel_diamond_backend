import express from 'express';
const routes = express.Router();

import locationController from '../../../controllers/adminpanel/appConfiguration/location.controller.js';
import {
  adminPanelAuth,
  adminPanelAuthWithoutPermission,
} from '../../../middleware/adminPanelAuth.js';

routes.post('/add', adminPanelAuth, locationController.addLocation);
routes.put('/update', adminPanelAuth, locationController.updateLocation);
routes.delete('/delete', adminPanelAuth, locationController.deleteLocation);
routes.get(
  '/get',
  adminPanelAuthWithoutPermission,
  locationController.getLocation
);

export default routes;
