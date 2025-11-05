import { errorResponse, successResponse } from '../../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../../config/db.config.js';
import { pagination } from '../../../helpers/pagination.js';
import { uploadFile } from '../../../helpers/image.js';

const { Op, Clarity } = db;

const getClarity = async (req, res) => {
  try {
    const allClarity = await Clarity.findAll({
      where: {
        is_deleted: false,
      },
    });
    return successResponse(res, 9105, { allClarity });
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};
const addClarity = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      clarity: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }
    const { clarity } = req.body;

    const addedClarity = await Clarity.create({
      clarity: clarity,
    });
    return successResponse(res, 9110);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const updateClarity = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      clarity: 'required',
      id: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }
    const { clarity, id } = req.body;

    const addedClarity = await Clarity.update(
      {
        clarity: clarity,
      },
      {
        where: {
          id: id,
        },
      }
    );
    return successResponse(res, 9113);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const deleteClarity = async (req, res) => {
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

    const checkExistClarity = await Clarity.findOne({
      where: {
        id,
        is_deleted: false,
      },
    });

    if (!checkExistClarity) {
      return errorResponse(res, 9115);
    }
    await checkExistClarity.update({
      is_deleted: true,
    });
    return successResponse(res, 9114);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

export default {
  addClarity,
  updateClarity,
  deleteClarity,
  getClarity,
};
