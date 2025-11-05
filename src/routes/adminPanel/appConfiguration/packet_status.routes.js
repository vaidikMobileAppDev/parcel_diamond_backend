import express from 'express';
const routes = express.Router();

import configrationController from '../../../controllers/adminpanel/appConfiguration/packet_status.controller.js';
import {
  adminPanelAuth,
  adminPanelAuthWithoutPermission,
} from '../../../middleware/adminPanelAuth.js';

routes.post('/add', adminPanelAuth, configrationController.addPacketStatus);
routes.put('/update', adminPanelAuth, configrationController.updatePacketStatus);
routes.delete('/delete', adminPanelAuth, configrationController.deletePacketStatus);
routes.get('/get',adminPanelAuth, configrationController.getAllPacketStatus);

export default routes;
