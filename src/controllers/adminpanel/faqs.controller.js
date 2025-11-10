import Validator from 'validatorjs';

import db from '../../config/db.config.js';

import { pagination } from '../../helpers/pagination.js';
import { errorResponse, successResponse } from '../../helpers/response.js';

const { sequelize, Faqs, Op } = db;

const createFaq = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();

    const validation = new Validator(req.body, {
      question: 'required|min:5',
      answer: 'required|min:5',
    });

    if (validation.fails()) {
      await transaction.rollback();
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { question, answer } = req.body;

    const payload = {
      question,
      answer,
      created_by: req.admin ? req.admin.id : null,
    };

    await Faqs.create(payload, { transaction });
    await transaction.commit();

    return successResponse(res, 7201);

  } catch (error) {
    if (transaction) await transaction.rollback();
    return errorResponse(res, 9999, error);
  }
};

const listFaqs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'DESC',
    } = req.query;

    const offset = (page - 1) * limit;

    const where = {
      is_deleted: false,
    };

    const orderArr = [[sortBy, order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']];

    const { count: total, rows } = await Faqs.findAndCountAll({
      where,
      limit,
      offset,
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

    const paginationData = await pagination(total, page, limit);

    const payload = {
      faqs: rows,
      paginationData
    };

    return successResponse(res, 7205, payload);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const updateFaq = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();

    const validation = new Validator(req.body, {
      id: 'required|integer|min:1',
      question: 'min:5',
      answer: 'min:5',
      is_published: 'boolean',
    });

    if (
      req.body.question === undefined &&
      req.body.answer === undefined &&
      req.body.is_published === undefined
    ) {
      return errorResponse(res, "Required missing field.");
    }

    if (validation.fails()) {
      await transaction.rollback();
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { id, question, answer, is_published } = req.body;

    const exiting = await Faqs.findOne({
      where: {
        id
      },
    }, { transaction });

    if (!exiting) {
      if (transaction) await transaction.rollback();
      return errorResponse(res, 7206);
    }

    const payload = {};

    if (question) payload.question = question
    if (answer) payload.answer = answer
    if (Boolean(is_published) === true || Boolean(is_published) === false) payload.is_published = is_published
    
    await Faqs.update(
      payload,
      {
        where: {
          id,
        },
      }, { transaction }
    );

    await transaction.commit();
    return successResponse(res, 7203);

  } catch (error) {
    if (transaction) await transaction.rollback();
    return errorResponse(res, 9999, error);
  }
}

const deleteFaq = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();

    const validation = new Validator(req.query, {
      id: 'required|integer|min:1',
    });

    if (validation.fails()) {
      await transaction.rollback();
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { id } = req.query;
    const exiting = await Faqs.findOne({
      where: {
        id,
        is_deleted: false
      },
    }, { transaction });

    if (!exiting) {
      if (transaction) await transaction.rollback();
      return errorResponse(res, 7206);
    }

    await Faqs.update(
      { is_deleted: true },
      {
        where: {
          id,
        },
      }, { transaction }
    );

    await transaction.commit();
    return successResponse(res, 7204);

  } catch (error) {
    if (transaction) await transaction.rollback();
    return errorResponse(res, 9999, error);
  }
}

export default {
  createFaq,
  listFaqs,
  updateFaq,
  deleteFaq,
};
