import express from 'express';
const routes = express.Router();

import faqsController from '../../controllers/public/faqs.controller.js';

routes.get('/get', faqsController.listFaqs);

export default routes;
