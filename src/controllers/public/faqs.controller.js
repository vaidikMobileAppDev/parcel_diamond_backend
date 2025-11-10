
import db from '../../config/db.config.js';

import { errorResponse, successResponse } from '../../helpers/response.js';

const { sequelize, Faqs, Op } = db;

const listFaqs = async (req, res) => {
  try {
    const {
      sortBy = 'createdAt',
      order = 'DESC',
    } = req.query;



    const where = {
      is_deleted: false,
      is_published: true
    };

    const orderArr = [[sortBy, order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']];

    const rows = await Faqs.findAll({
      where,
      order: orderArr,
      attributes: [
        "id",
        "question",
        "answer",
        "is_published",
        "is_deleted",
        "created_by",
        "updated_by",
        "createdAt",
        "updatedAt",
      ],
    });
    const payload = {
      faqs: rows,
    };

    return successResponse(res, 7205, payload);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

export default {
  listFaqs,
};
