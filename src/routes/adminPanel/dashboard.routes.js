import express from 'express';
const routes = express.Router();

import dashboardController from '../../controllers/adminpanel/dashboard.controller.js';
import { adminPanelAuth } from '../../middleware/adminPanelAuth.js';

routes.get('/get', adminPanelAuth, dashboardController.getDashboard);
routes.get('/get-excel', adminPanelAuth, dashboardController.getExcelData);

export default routes;
