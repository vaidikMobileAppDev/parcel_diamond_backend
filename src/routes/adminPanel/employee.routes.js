import express from 'express';
const routes = express.Router();

import employeeController from '../../controllers/adminpanel/employee.controller.js';
import { adminPanelAuth } from '../../middleware/adminPanelAuth.js';
routes.post('/add', adminPanelAuth, employeeController.addEmployee);

export default routes;
