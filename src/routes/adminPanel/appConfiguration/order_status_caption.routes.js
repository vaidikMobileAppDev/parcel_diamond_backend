import express from 'express';
const routes = express.Router();

import configrationController from '../../../controllers/adminpanel/appConfiguration/order_status_caption.controller.js';
import {
  adminPanelAuth,
  adminPanelAuthWithoutPermission,
} from '../../../middleware/adminPanelAuth.js';

routes.post('/add', adminPanelAuth, configrationController.addOrderStatus);
routes.put('/update', adminPanelAuth, configrationController.updateOrderStatus);
routes.delete('/delete', adminPanelAuth, configrationController.deleteOrderStatus);
routes.get('/get',adminPanelAuth, configrationController.getAllOrderStatus);

export default routes;
