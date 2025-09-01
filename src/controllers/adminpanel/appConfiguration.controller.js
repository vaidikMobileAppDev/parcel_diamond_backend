import { errorResponse, successResponse } from '../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../config/db.config.js';
import { pagination } from '../../helpers/pagination.js';

const { Op, SieveSize, Country, Clarity, Color, Shape } = db;
const getSieveSize = async (req, res) => {
  try {
    const allSieveSize = await SieveSize.findAll({
      where: {
        is_deleted: false,
      },
    });
    return successResponse(res, 9101, { allSieveSize });
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

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

const getShape = async (req, res) => {
  try {
    const allShape = await Shape.findAll({
      where: {
        is_deleted: false,
      },
    });
    return successResponse(res, 9104, { allShape });
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

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

export default {
  getSieveSize,
  getCountry,
  getColor,
  getShape,
  getClarity,
};
