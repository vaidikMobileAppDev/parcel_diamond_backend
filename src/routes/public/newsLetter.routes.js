import express from 'express';
const routes = express.Router();

import newsletterController from '../../controllers/public/newsLetter.controller.js';

routes.post('/add', newsletterController.addSubscribe);
routes.get('/unsubscribe', newsletterController.unsubscribe);
routes.delete('/unsubscribe', newsletterController.unsubscribe);

export default routes;
