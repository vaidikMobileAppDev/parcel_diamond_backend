import express from 'express';
const routes = express.Router();


import enquiryRoutes from "./enquiry.routes.js"
routes.use("/enquiry", enquiryRoutes)

import newsLatterRoutes from './newsLetter.routes.js';
routes.use('/news_letter', newsLatterRoutes);

import faqsRoutes from './faqs.routes.js';
routes.use('/faqs', faqsRoutes);

export default routes;
