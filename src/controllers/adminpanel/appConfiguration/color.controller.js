import { errorResponse, successResponse } from '../../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../../config/db.config.js';
import { pagination } from '../../../helpers/pagination.js';
import { uploadFile } from '../../../helpers/image.js';

const { Op, Color } = db;

const getColor = async (req, res) => {
  try {
    const allColor = await Color.findAll({
      where: {
        is_deleted: false,
      },
    });
    return successResponse(res, 9103, { allColor });
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};
const addColor = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      color: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }
    const { color } = req.body;

    const addedColor = await Color.create({
      color: color,
    });
    return successResponse(res, 9108);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const updateColor = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      color: 'required',
      id: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }
    const { color, id } = req.body;

    const addedClarity = await Color.update(
      {
        color: color,
      },
      {
        where: {
          id: id,
        },
      }
    );
    return successResponse(res, 9116);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const deleteColor = async (req, res) => {
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

    const checkExistClarity = await Color.findOne({
      where: {
        id,
        is_deleted: false,
      },
    });

    if (!checkExistClarity) {
      return errorResponse(res, 9118);
    }
    await checkExistClarity.update({
      is_deleted: true,
    });
    return successResponse(res, 9117);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

export default {
  addColor,
  updateColor,
  deleteColor,
  getColor,
};
