import { errorResponse, successResponse } from '../../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../../config/db.config.js';
import { pagination } from '../../../helpers/pagination.js';
import { uploadFile } from '../../../helpers/image.js';

const { Op, Country } = db;

const getCountry = async (req, res) => {
  try {
    const allCountry = await Country.findAll({
      where: {
        is_deleted: false,
      },
    });
    return successResponse(res, 9102, { allCountry });
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const addCountry = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      name: 'required',
      code: 'required',
      dial_code: 'required',
      currency: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }
    const { name, code, dial_code, currency } = req.body;

    const addedCountry = await Country.create({
      name: name,
      code: code,
      dial_code: dial_code,
      currency: currency,
    });
    return successResponse(res, 9107);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const updateCountry = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      name: 'required',
      code: 'required',
      dial_code: 'required',
      currency: 'required',
      id: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }
    const { name, code, dial_code, currency, id } = req.body;

    const addedClarity = await Country.update(
      {
        name,
        code,
        dial_code,
        currency,
      },
      {
        where: {
          id: id,
        },
      }
    );
    return successResponse(res, 9119);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const deleteCountry = async (req, res) => {
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

    const checkExistClarity = await Country.findOne({
      where: {
        id,
        is_deleted: false,
      },
    });

    if (!checkExistClarity) {
      return errorResponse(res, 9121);
    }
    await checkExistClarity.update({
      is_deleted: true,
    });
    return successResponse(res, 9120);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};
export default {
  addCountry,
  updateCountry,
  deleteCountry,
  getCountry,
};
