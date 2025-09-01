import express from 'express';
const routes = express.Router();

import supplierController from '../../controllers/adminpanel/supplier.controller.js';
import { adminPanelAuth } from '../../middleware/adminPanelAuth.js';
routes.post('/add', adminPanelAuth, supplierController.addSupplier);
routes.get('/get', adminPanelAuth, supplierController.getSupplier);

export default routes;
