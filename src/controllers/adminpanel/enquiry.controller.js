import Validator from 'validatorjs';

import db from '../../config/db.config.js';
import { pagination } from '../../helpers/pagination.js';
import { errorResponse, successResponse } from '../../helpers/response.js';

const { Op, literal, fn, col, sequelize, GeneralEnquiry, Customer, CustomerBusinessCard, CustomerBusinessCertificate, CustomerCartItem, DiamondLot, DiamondGrade, SieveSize, Shape, Color, Clarity } = db;

const addEnqiryByAdmin = async (req, res) => {
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

const listEnqiries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      order = 'DESC',
    } = req.query;

    const offset = (page - 1) * limit;

    const where = {
      is_deleted: false,
    };

    if (search && search.toString().trim() !== '') {
      const q = `%${search.toString().trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: q } },
        { email: { [Op.like]: q } },
        { company_name: { [Op.like]: q } },
        { message: { [Op.like]: q } },
        { mobileno: { [Op.like]: q } },
      ];
    }

    let orderArr = [[sortBy, order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']];


    const { count: total, rows } = await GeneralEnquiry.findAndCountAll({
      where,
      limit,
      offset,
      order: orderArr,
      attributes: [
        'id',
        'name',
        'email',
        'mobcode',
        'mobileno',
        'company_name',
        'message',
        'is_deleted',
        'createdAt',
        'updatedAt',
      ],
    });



    const paginationData = await pagination(total, page, limit);
    const payload = {
      enqiries: rows,
      paginationData
    };

    return successResponse(res, 7002, payload);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const deleteEnqiry = async (req, res) => {
  let transaction;
  try {
    const id = req.query.id;
    if (!id) return errorResponse(res, 'Enquiry id is required.');

    transaction = await sequelize.transaction();

    const enquiry = await GeneralEnquiry.findOne({
      where: { id, is_deleted: false },
      transaction,
    });

    if (!enquiry) {
      await transaction.rollback();
      return errorResponse(res, 'Enquiry not found.');
    }

    enquiry.is_deleted = true;
    await enquiry.save({ transaction });

    await transaction.commit();
    return successResponse(res, 7004);
  } catch (error) {
    if (transaction) await transaction.rollback();
    return errorResponse(res, 9999, error);
  }
};

export default {
  addEnqiryByAdmin,
  listEnqiries,
  deleteEnqiry,
};
