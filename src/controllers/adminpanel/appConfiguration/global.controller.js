import { errorResponse, successResponse } from '../../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../../config/db.config.js';
import { pagination } from '../../../helpers/pagination.js';
import { uploadFile } from '../../../helpers/image.js';

const { Op, GlobalPrice, Admin } = db;

const addConfigrationGlobalPrice = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      currency: 'required',
      rate: 'required|numeric|min:0.1',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { currency, rate, sign, caption } = req.body;

    const checkExistGlobalPrice = await GlobalPrice.findOne({
      where: {
        currency: currency.toLowerCase(),
        is_deleted: false,
      },
    });

    if (checkExistGlobalPrice) {
      return errorResponse(res, 3012);
    }

    await GlobalPrice.create({
      currency: currency,
      price: rate,
      sign: sign || null,
      caption: caption || currency,
    });
    return successResponse(res, 3007);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const updateConfigrationGlobalPrice = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      id: 'required',
      currency: 'required',
      rate: 'required|numeric|min:0.1',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { id, currency, rate, sign, caption } = req.body;

    const checkExistGlobalPrice = await GlobalPrice.findByPk(id);

    if (!checkExistGlobalPrice) {
      return errorResponse(res, 3011);
    }

    const isUniqueName = await GlobalPrice.findOne({     
      where: {
        currency: {
            [Op.iLike]: currency, // case-insensitive match
          },
        id: {
          [Op.ne]: id, 
        },
        is_deleted: false,
      }
    });

    if (isUniqueName) {
      return errorResponse(res, 3012);
    }

    checkExistGlobalPrice.currency = currency || checkExistGlobalPrice.currency ;
    checkExistGlobalPrice.caption = caption || checkExistGlobalPrice.caption;
    checkExistGlobalPrice.sign = sign || checkExistGlobalPrice.sign;
    checkExistGlobalPrice.price = rate || checkExistGlobalPrice.price;
    await checkExistGlobalPrice.save();
   
    return successResponse(res, 3008);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const deleteConfigrationGlobalPrice = async (req, res) => {
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

    const checkExistGlobalPrice = await GlobalPrice.findOne({
      where: {
        id,
        is_deleted: false,
      },
    });

    if (!checkExistGlobalPrice) {
      return errorResponse(res, 3011);
    }

    await checkExistGlobalPrice.update({
      is_deleted: true,
    });
    return successResponse(res, 3009);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const getConfigrationGlobalPrice = async (req, res) => {
  try {
    const allGlobalPrice = await GlobalPrice.findAll({
      where: {
        is_deleted: false,
      },
    });
    return successResponse(res, 3010, { allGlobalPrice });
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const setGlobalPriceDefault = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      id: 'required'
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { id } = req.body;

    const currencyData = await GlobalPrice.findOne({
      where: {
        id,
        is_deleted: false,
      },
    });

    if (!currencyData) {
      return errorResponse(res, "Currency Not Found.");
    }

    const adminData = await Admin.findByPk(req.admin.id);   

    if (!adminData) {
      return errorResponse(res, "Admin Not Found.");
    }
    
    adminData.currency_id = Number(id);
    await adminData.save();
  
    return successResponse(res, 3013);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

export default {
  addConfigrationGlobalPrice,
  updateConfigrationGlobalPrice,
  deleteConfigrationGlobalPrice,
  getConfigrationGlobalPrice,
  setGlobalPriceDefault
};
