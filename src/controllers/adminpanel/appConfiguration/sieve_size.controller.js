import { errorResponse, successResponse } from '../../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../../config/db.config.js';
import { pagination } from '../../../helpers/pagination.js';
import { uploadFile } from '../../../helpers/image.js';

const { Op, SieveSize, Shape } = db;

const getSieveSize = async (req, res) => {
  try {
    const { shape_id, status } = req.query;
    const allSieveSize = await SieveSize.findAll({
      where: {
        is_deleted: false,
        ...(shape_id && { shape_id: shape_id }),
        ...(status && { status }),
      },
      include: [
        {
          model: Shape,
          as: 'shapeDetail',
          attributes: ['id', 'shape'],
        },
      ],
    });
    return successResponse(res, 9101, { allSieveSize });
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const addSieveSize = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      size: 'required',
      shape_id: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }
    const { size, shape_id } = req.body;

    const addedSieveSize = await SieveSize.create({
      size: size,
      shape_id: shape_id,
    });
    return successResponse(res, 9106);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const updateSieveSize = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      size: 'required',
      shape_id: 'required',
      id: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }
    const { size, shape_id, id, status } = req.body;
    
     let updData = { size, shape_id };

    if(status){
      updData = { ...updData, status };
    }

    await SieveSize.update( updData, { where: { id: id} });
    return successResponse(res, 9125);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const deleteSieveSize = async (req, res) => {
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

    const checkExistClarity = await SieveSize.findOne({
      where: {
        id,
        is_deleted: false,
      },
    });

    if (!checkExistClarity) {
      return errorResponse(res, 9127);
    }
    await checkExistClarity.update({
      is_deleted: true,
    });
    return successResponse(res, 9126);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

export default {
  addSieveSize,
  updateSieveSize,
  deleteSieveSize,
  getSieveSize,
};
