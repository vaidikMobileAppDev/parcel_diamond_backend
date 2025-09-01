import express from 'express';
import cors from 'cors';
import multer from 'multer';
import db from './config/db.config.js';
import routes from './routes/index.js';
import syncPermission from './helpers/syncPermissionFields.js';
import auditLogger from './middleware/auditLogger.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(multer().any());
app.use(auditLogger);

app.use('/api/v1', routes);

app.get('/', (req, res) => {
  return res.status(200).json({ message: 'welcome to parcel diamonds' });
});
export default app;
