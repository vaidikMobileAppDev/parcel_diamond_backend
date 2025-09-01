import db from '../config/db.config.js';

const { AuditLog } = db;
const auditLogger = async (req, res, next) => {
  try {
    // const userId = req.user ? req.user.id : null; // set by auth middleware

    await AuditLog.create({
      //   userId,
      method: req.method,
      baseUrl: req.baseUrl,
      url: req.originalUrl,
      payload: req.body,
      query: req.query,
      params: req.params,
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }

  next();
};

export default auditLogger;
