import express from 'express';
const routes = express.Router();

import newsletterController from '../../controllers/adminpanel/newsLetter.controller.js';
import { adminPanelAuth } from '../../middleware/adminPanelAuth.js';


routes.get('/get', adminPanelAuth, newsletterController.getSubscriberList);


export default routes;
