import { errorResponse, successResponse } from '../../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../../config/db.config.js';
import { pagination } from '../../../helpers/pagination.js';
import { uploadFile } from '../../../helpers/image.js';

const { Op, SupplierCategory } = db;
const getSupplierCategory = async (req, res) => {
  try {
    const allSupplierCategory = await SupplierCategory.findAll({
      where: {
        is_deleted: false,
      },
    });
    return successResponse(res, 9111, { allSupplierCategory });
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};
const addSupplierCategory = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      supplier_category: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }
    const { supplier_category } = req.body;

    const addedSupplierCategory = await SupplierCategory.create({
      supplier_category: supplier_category,
    });
    return successResponse(res, 9112);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const updateSupplierCategory = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      supplier_category: 'required',
      id: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }
    const { supplier_category, id } = req.body;

    const addedClarity = await SupplierCategory.update(
      {
        supplier_category: supplier_category,
      },
      {
        where: {
          id: id,
        },
      }
    );
    return successResponse(res, 9128);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const deleteSupplierCategory = async (req, res) => {
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

    const checkExistClarity = await SupplierCategory.findOne({
      where: {
        id,
        is_deleted: false,
      },
    });

    if (!checkExistClarity) {
      return errorResponse(res, 9130);
    }
    await checkExistClarity.update({
      is_deleted: true,
    });
    return successResponse(res, 9129);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};
export default {
  addSupplierCategory,
  updateSupplierCategory,
  deleteSupplierCategory,
  getSupplierCategory,
};
