import express from 'express';
const routes = express.Router();

import faqsController from '../../controllers/adminpanel/faqs.controller.js';
import { adminPanelAuth } from '../../middleware/adminPanelAuth.js';


routes.post('/add', adminPanelAuth, faqsController.createFaq);
routes.get('/get', adminPanelAuth, faqsController.listFaqs);
routes.put('/update', adminPanelAuth, faqsController.updateFaq);
routes.delete('/delete', adminPanelAuth, faqsController.deleteFaq);

export default routes;
