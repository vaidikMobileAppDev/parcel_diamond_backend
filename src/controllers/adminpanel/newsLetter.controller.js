import db from '../../config/db.config.js';
import { pagination } from '../../helpers/pagination.js';
import { errorResponse, successResponse } from '../../helpers/response.js';

const { sequelize, NewsletterSubscriber } = db;



const getSubscriberList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      order = 'DESC',
      subscribedOnly = 'true',
    } = req.query;

    const offset = (page - 1) * limit;

    const where = {
      is_deleted: false,
    };

    if (subscribedOnly === 'true') where.is_subscribed = true;

    if (search && search.toString().trim() !== '') {
      const q = `%${search.toString().trim()}%`;
      where[sequelize.Op.or] = [
        { email: { [sequelize.Op.like]: q } },
        { name: { [sequelize.Op.like]: q } },
      ];
    }

    const { count: total, rows } = await NewsletterSubscriber.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sortBy, order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
      attributes: ['id', 'email', 'name', 'is_subscribed', 'createdAt', 'updatedAt'],
    });

    const paginationData = await pagination(total, page, limit);

    return successResponse(res, 7103, {
      paginationData,
      subscribers: rows,
    });

  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

export default {
  getSubscriberList,
};
