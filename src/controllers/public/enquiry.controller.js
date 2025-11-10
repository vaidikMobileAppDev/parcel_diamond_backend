import Validator from 'validatorjs';

import db from '../../config/db.config.js';
import { errorResponse, successResponse } from '../../helpers/response.js';

const { Op, literal, fn, col, sequelize, GeneralEnquiry, Customer, CustomerBusinessCard, CustomerBusinessCertificate, CustomerCartItem, DiamondLot, DiamondGrade, SieveSize, Shape, Color, Clarity } = db;

const addEnqiry = async (req, res) => {
  const payload = req.body;
  let transaction;
  try {
    transaction = await sequelize.transaction();

    const validation = new Validator(req.body, {
      name: 'required|min:2',
      email: 'required|email',
      message: 'required|min:5',
    });

    if (validation.fails()) {
      await transaction.rollback();
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const {
      name,
      email,
      mobcode,
      mobileno,
      company_name,
      message,
    } = payload;

    await GeneralEnquiry.create({
      name: name.toLowerCase(),
      email,
      mobcode,
      mobileno,
      company_name,
      message,
    }, { transaction });

    await transaction.commit();
    return successResponse(res, 7001);

  } catch (error) {
    if (transaction) await transaction.rollback();
    return errorResponse(res, 9999, error);
  }
};

export default {
  addEnqiry,
};
