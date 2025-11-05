import express from 'express';
const routes = express.Router();

import regionController from '../../../controllers/adminpanel/appConfiguration/region.controller.js';
import {
  adminPanelAuth,
  adminPanelAuthWithoutPermission,
} from '../../../middleware/adminPanelAuth.js';

routes.post('/add', adminPanelAuth, regionController.addRegion);
routes.put('/update', adminPanelAuth, regionController.updateRegion);
routes.delete('/delete', adminPanelAuth, regionController.deleteRegion);
routes.get(
  '/get',
    adminPanelAuthWithoutPermission,
  regionController.getRegion
);

export default routes;
