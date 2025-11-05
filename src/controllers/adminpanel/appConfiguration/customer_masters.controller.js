import { errorResponse, successResponse } from '../../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../../config/db.config.js';
import { pagination } from '../../../helpers/pagination.js';
import { uploadFile } from '../../../helpers/image.js';

const { Op, CustomerRoles } = db;
const addConfigrationRole = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      name: 'required',
      discount_on_price: 'required',
      free_shipping: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { name, discount_on_price, free_shipping } = req.body;

    const checkExistCustomerRole = await CustomerRoles.findOne({
      where: {
        name: name.toLowerCase(),
        is_deleted: false,
      },
    });

    if (checkExistCustomerRole) {
      return errorResponse(res, 3002);
    }

    await CustomerRoles.create({
      name: name.toLowerCase(),
      discount_on_price: discount_on_price,
      free_shipping: free_shipping,
    });

    return successResponse(res, 3001);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const updateConfigrationRole = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      id: 'required',
      name: 'required',
      discount_on_price: 'required',
      free_shipping: 'required',
      status: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { id, name, discount_on_price, free_shipping, status } = req.body;

    const checkExistCustomerRole = await CustomerRoles.findOne({
      where: {
        id,
        is_deleted: false,
      },
    });

    if (!checkExistCustomerRole) {
      return errorResponse(res, 3003);
    }

    const checkExistCustomerRoleName = await CustomerRoles.findOne({
      where: {
        name: name.toLowerCase(),
        is_deleted: false,
        id: {
          [Op.ne]: id,
        },
      },
    });

    if (checkExistCustomerRoleName) {
      return errorResponse(res, 3002);
    }

    await checkExistCustomerRole.update({
      name: name.toLowerCase(),
      discount_on_price: discount_on_price,
      free_shipping: free_shipping,
      status: status,
    });

    return successResponse(res, 3004);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const deleteConfigrationRole = async (req, res) => {
  try {
    const validation = new Validator(req.query, {
      id: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { id } = req.query;

    const checkExistCustomerRole = await CustomerRoles.findOne({
      where: {
        id,
        is_deleted: false,
      },
    });

    if (!checkExistCustomerRole) {
      return errorResponse(res, 3003);
    }
    await checkExistCustomerRole.update({
      is_deleted: true,
    });

    return successResponse(res, 3005);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const getConfigrationRole = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    const { fields } = req.permission;

    const data = await CustomerRoles.findAndCountAll({
      attributes: fields,
      where: {
        ...(search && {
          [Op.or]: [{ name: { [Op.substring]: `%${search}%` } }],
        }),
        is_deleted: false,
      },
      order: [['createdAt', 'DESC']],
      limit: limit,
      offset: offset,
    });

    const paginationData = await pagination(data.count, page, limit);

    const response = {
      paginationData,
      roles: data.rows,
    };
    return successResponse(res, 3006, response);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

export default {
  addConfigrationRole,
  updateConfigrationRole,
  deleteConfigrationRole,
  getConfigrationRole,
};
