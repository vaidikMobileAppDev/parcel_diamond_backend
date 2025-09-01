import express from 'express';
const routes = express.Router();

import customerController from '../../controllers/adminpanel/customer.controller.js';
import { adminPanelAuth } from '../../middleware/adminPanelAuth.js';
routes.post('/add', adminPanelAuth, customerController.addCustomer);
routes.get('/get', adminPanelAuth, customerController.getCustomerList);
routes.put(
  '/update-status',
  adminPanelAuth,
  customerController.updateCustomerStatus
);

export default routes;
