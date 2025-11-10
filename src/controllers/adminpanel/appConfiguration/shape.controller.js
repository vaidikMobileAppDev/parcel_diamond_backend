import { errorResponse, successResponse } from '../../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../../config/db.config.js';
import { pagination } from '../../../helpers/pagination.js';
import { uploadFile } from '../../../helpers/image.js';

const { Op, Shape } = db;

const getShape = async (req, res) => {
  try {
    const { status } = req.query;
    const allShape = await Shape.findAll({
      where: {
        is_deleted: false,
        ...(status && { status }),
      },
    });
    return successResponse(res, 9104, { allShape });
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};
const addShape = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      shape: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }
    const { shape } = req.body;

    const addedShape = await Shape.create({
      shape: shape,
    });
    return successResponse(res, 9109);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const updateShape = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      shape: 'required',
      id: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }
    const { shape, id, status } = req.body;

    let updData = { shape: shape }

    if(status){
      updData = { ...updData, status }
    }

    await Shape.update( updData, { where: { id: id, }, } );
    
    return successResponse(res, 9122);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const deleteShape = async (req, res) => {
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

    const checkExistClarity = await Shape.findOne({
      where: {
        id,
        is_deleted: false,
      },
    });

    if (!checkExistClarity) {
      return errorResponse(res, 9124);
    }
    await checkExistClarity.update({
      is_deleted: true,
    });
    return successResponse(res, 9123);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

export default {
  addShape,
  updateShape,
  deleteShape,
  getShape,
};
