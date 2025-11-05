import { errorResponse, successResponse } from '../../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../../config/db.config.js';

const { Op, Order_status_caption } = db;

const getAllOrderStatus = async (req, res) => {
  try {
    const allOrderStatus = await Order_status_caption.findAll({
      where: {
        is_deleted: false,
      },
    });
    return successResponse(res, 9149, { allOrderStatus });
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};
const addOrderStatus = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      name: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const { name, parentid, customer_caption, admin_caption, description } = req.body;
    const isUnique = await Order_status_caption.findOne({
      where: {
        name: {
            [Op.iLike]: name, // case-insensitive match
          },
        is_deleted: false,
      }
    });

    if (isUnique) {
      return errorResponse(res, "Name Must be Unique.");
    }

    const statusData = {
      name: name,
      parentid: parentid || null,
      customer_caption: customer_caption || null,
      admin_caption: admin_caption || null,
      description: description || null,
    }

    await Order_status_caption.create(statusData);
    return successResponse(res, 9150);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      name: 'required',
      id: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }
   const { name, id, parentid, customer_caption, admin_caption, description } = req.body;

   const isUnique = await Order_status_caption.findOne({
      where: {
        name: {
            [Op.iLike]: name, // case-insensitive match
          },
        is_deleted: false,
        id: {
          [Op.ne]: id, 
        },
      }
   });

   if (isUnique) {
      return errorResponse(res, "Name Must be Unique.");
   }

   const statusData = await Order_status_caption.findByPk(id);

   if (!statusData) {
      return errorResponse(res, "Data Not Found.");
   }

   statusData.name = name;
   statusData.parentid = parentid || statusData.parentid;
   statusData.customer_caption = customer_caption || statusData.customer_caption;
   statusData.admin_caption = admin_caption || statusData.admin_caption;
   statusData.description = description || statusData.description;
   await statusData.save();
  
    return successResponse(res, 9151);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const deleteOrderStatus = async (req, res) => {
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

    const isExists = await Order_status_caption.findOne({
      where: {
        id,
        is_deleted: false,
      },
    });

    if (!isExists) {
      return errorResponse(res, 9153);
    }
    await isExists.update({
      is_deleted: true,
    });

    // await Order_status_caption.destroy({
    //   where: { id },
    // });

    return successResponse(res, 9152);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

export default {
  getAllOrderStatus,
  addOrderStatus,
  updateOrderStatus,
  deleteOrderStatus,
};
