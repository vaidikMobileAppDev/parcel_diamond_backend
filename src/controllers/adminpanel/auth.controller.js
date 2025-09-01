import { errorResponse, successResponse } from '../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../config/db.config.js';
import { pagination } from '../../helpers/pagination.js';
import bcrypt from 'bcrypt';

const {
  Admin,
  AdminSession,
  EmployeePermissions,
  AdminPanelPermissions,
  Roles,
  Op,
} = db;

const login = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      email: 'required',
      password: 'required',
      device_id: 'required',
      device_type: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }
    const { email, password, device_id } = req.body;

    const checkExistAdmin = await Admin.findOne({
      where: {
        email: email,
      },
    });

    if (!checkExistAdmin) {
      return errorResponse(res, 1003);
    }
    if (checkExistAdmin.is_account_deleted) {
      return errorResponse(res, 9002);
    }

    if (!checkExistAdmin.is_active && checkExistAdmin.is_inactive_by_admin) {
      return errorResponse(res, 9003);
    }
    if (!checkExistAdmin.is_active) {
      return errorResponse(res, 9004);
    }

    if (!bcrypt.compareSync(password, checkExistAdmin.password)) {
      return errorResponse(res, 1004);
    }

    const sessionToken = await AdminSession.createSessionToken(
      checkExistAdmin.id,
      device_id
    );
    const refreshToken = await AdminSession.createToken(
      checkExistAdmin.id,
      device_id
    );
    const getPermissionList = await getPermission(
      checkExistAdmin.id,
      checkExistAdmin.role,
      checkExistAdmin.sub_role
    );
    if (!getPermissionList.status) {
      return errorResponse(res, getPermissionList.error);
    }

    let response = {
      permissionList: getPermissionList.data,
      sessionToken,
      refreshToken,
    };
    return successResponse(res, 1001, response);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const getPermission = async (id, role, sub_role) => {
  let response = {};
  try {
    let getPermissions;
    let getPageAccess;
    if (role == 'superadmin') {
      getPageAccess = await Roles.findAll();
      getPermissions = await AdminPanelPermissions.findAll();
    } else {
      getPermissions = await EmployeePermissions.findAll({
        where: {
          admin_id: id,
        },
      });

      const getRolePermissions = await EmployeePermissions.findAll({
        attributes: [],
        where: {
          admin_id: id,
        },
        include: [
          {
            model: AdminPanelPermissions,
            attributes: ['role_id'],
          },
        ],
      });

      const getRoleIds = await getRolePermissions.map(
        (item) => item.admin_panel_permission.role_id
      );
      getPageAccess = await Roles.findAll({
        where: {
          id: {
            [Op.in]: getRoleIds,
          },
        },
      });
    }
    if (getPermissions && getPermissions.length > 0) {
      response = {
        status: true,
        data: { getPageAccess, getPermissions },
      };
    } else {
      response = {
        status: false,
        error: 'No permission found',
      };
    }
  } catch (error) {
    response = {
      status: false,
      error: error.message ? error.message : error,
    };
  } finally {
    return response;
  }
};
export default { login };
