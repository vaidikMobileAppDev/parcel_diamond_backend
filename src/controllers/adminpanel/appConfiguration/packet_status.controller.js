import { errorResponse, successResponse } from '../../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../../config/db.config.js';

const { Op, Packet_status } = db;

const getAllPacketStatus = async (req, res) => {
  try {
    const allPacketStatus = await Packet_status.findAll({
      where: {
        is_deleted: false,
      },
    });
    return successResponse(res, 9154, { allPacketStatus });
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};
const addPacketStatus = async (req, res) => {
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

    const { name, customer_caption, admin_caption, description } = req.body;
    const isUnique = await Packet_status.findOne({
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
      customer_caption: customer_caption || null,
      admin_caption: admin_caption || null,
      description: description || null,
    }

    await Packet_status.create(statusData);
    return successResponse(res, 9155);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const updatePacketStatus = async (req, res) => {
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
   const { name, id, customer_caption, admin_caption, description } = req.body;

   const isUnique = await Packet_status.findOne({
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

   const statusData = await Packet_status.findByPk(id);

   if (!statusData) {
      return errorResponse(res, "Data Not Found.");
   }

   statusData.name = name;
   statusData.customer_caption = customer_caption || statusData.customer_caption;
   statusData.admin_caption = admin_caption || statusData.admin_caption;
   statusData.description = description || statusData.description;
   await statusData.save();
  
    return successResponse(res, 9156);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const deletePacketStatus = async (req, res) => {
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

    const isExists = await Packet_status.findOne({
      where: {
        id,
        is_deleted: false,
      },
    });

    if (!isExists) {
      return errorResponse(res, 9158);
    }
    await isExists.update({
      is_deleted: true,
    });

    // await Packet_status.destroy({
    //   where: { id },
    // });

    return successResponse(res, 9157);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

export default {
  getAllPacketStatus,
  addPacketStatus,
  updatePacketStatus,
  deletePacketStatus,
};
