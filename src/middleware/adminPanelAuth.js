import { errorResponse } from '../helpers/response.js';
import Validator from 'validatorjs';
import db from '../config/db.config.js';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import roles from '../../seedsData/roles.js';

const { Admin, AdminSession, EmployeePermissions, AdminPanelPermissions } = db;

const adminPanelAuth = async (req, res, next) => {
  try {
    const validation = new Validator(req.headers, {
      authorization: 'required',
    });

    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { authorization } = req.headers;

    let decode;
    try {
      decode = jwt.verify(authorization, config.jwt.secret);
    } catch (error) {
      return errorResponse(res, 9001, '', 401);
    }

    const checkAdminSession = await AdminSession.findOne({
      where: {
        session_token: authorization,
      },
    });

    if (!checkAdminSession) {
      return errorResponse(res, 9001, '', 401);
    }

    const checkExistAdmin = await Admin.findOne({
      where: {
        id: checkAdminSession.admin_id,
      },
    });

    if (!checkExistAdmin) {
      return errorResponse(res, 1003, '', 401);
    }
    if (checkExistAdmin.is_account_deleted) {
      return errorResponse(res, 9002, '', 401);
    }

    if (!checkExistAdmin.is_active && checkExistAdmin.is_inactive_by_admin) {
      return errorResponse(res, 9003, '', 402);
    }
    if (!checkExistAdmin.is_active) {
      return errorResponse(res, 9004, '', 401);
    }

    const checkExistRoute = await AdminPanelPermissions.findOne({
      where: {
        backend_path: req.originalUrl?.split('?')[0],
      },
    });

    if (!checkExistRoute) {
      await updatePermissiontable({
        originalUrl: req.originalUrl,
        name: req.baseUrl.split('/').pop(),
      });
    }

    let checkPermission = await EmployeePermissions.findOne({
      where: {
        admin_id: checkExistAdmin.id,
        backend_path: req.originalUrl?.split('?')[0],
      },
    });

    if (!checkPermission && checkExistAdmin.role !== 'superadmin') {
      return errorResponse(res, 9005, '', 401);
    }
    if (checkExistAdmin.role == 'superadmin') {
      checkPermission = await AdminPanelPermissions.findOne({
        where: {
          backend_path: req.originalUrl?.split('?')[0],
        },
      });
    }

    if (req.method == 'GET' && checkPermission.fields.length == 0) {
      return errorResponse(res, 9007, '', 401);
    }

    req.admin = checkExistAdmin;
    req.permission = checkPermission;
    next();
  } catch (error) {
    console.log('error', error);
    return errorResponse(res, 9001, error, 401);
  }
};

const updatePermissiontable = async ({ originalUrl, name }) => {
  try {
    console.log('first');
    if (!['auth'].includes(name)) {
      const role_id = roles.filter((role) => role.name == name)?.[0]?.id;
      console.log('role_id', role_id);
      await AdminPanelPermissions.create({
        role_id: role_id,
        name: originalUrl
          .split('?')[0]
          .split('/')
          .join('_')
          .split('_api')
          .join('api'),
        frontend_path: 'update frontend path',
        backend_path: originalUrl.split('?')[0],
        fields: [],
      });
    }
  } catch (error) {
    console.log('error', error);
  }
};

const adminPanelAuthWithoutPermission = async (req, res, next) => {
  try {
    const validation = new Validator(req.headers, {
      authorization: 'required',
    });

    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { authorization } = req.headers;

    let decode;
    try {
      decode = jwt.verify(authorization, config.jwt.secret);
    } catch (error) {
      return errorResponse(res, 9001, '', 401);
    }

    const checkAdminSession = await AdminSession.findOne({
      where: {
        session_token: authorization,
      },
    });

    if (!checkAdminSession) {
      return errorResponse(res, 9001, '', 401);
    }

    const checkExistAdmin = await Admin.findOne({
      where: {
        id: checkAdminSession.admin_id,
      },
    });

    if (!checkExistAdmin) {
      return errorResponse(res, 1003, '', 401);
    }
    if (checkExistAdmin.is_account_deleted) {
      return errorResponse(res, 9002, '', 401);
    }

    if (!checkExistAdmin.is_active && checkExistAdmin.is_inactive_by_admin) {
      return errorResponse(res, 9003, '', 402);
    }
    if (!checkExistAdmin.is_active) {
      return errorResponse(res, 9004, '', 401);
    }
    req.admin = checkExistAdmin;
    next();
  } catch (error) {
    console.log('error', error);
    return errorResponse(res, 9001, error, 401);
  }
};

export { adminPanelAuth, adminPanelAuthWithoutPermission };
