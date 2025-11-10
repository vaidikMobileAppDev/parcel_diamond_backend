import express from 'express';
const routes = express.Router();

import enquiryController from '../../controllers/public/enquiry.controller.js'

routes.post('/add', enquiryController.addEnqiry);

export default routes;