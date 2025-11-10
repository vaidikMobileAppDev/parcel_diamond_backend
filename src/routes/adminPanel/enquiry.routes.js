import express from 'express';
const routes = express.Router();

import enquiryController from '../../controllers/adminpanel/enquiry.controller.js';
import { adminPanelAuth } from '../../middleware/adminPanelAuth.js';

routes.post('/add', adminPanelAuth, enquiryController.addEnqiryByAdmin);
routes.get('/get', adminPanelAuth, enquiryController.listEnqiries);
routes.delete('/delete', adminPanelAuth, enquiryController.deleteEnqiry);


export default routes;
