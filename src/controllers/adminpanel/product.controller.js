import { errorResponse, successResponse } from '../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../config/db.config.js';
import { pagination } from '../../helpers/pagination.js';
import { uploadFile } from '../../helpers/image.js';
import { getFieldsNameOfTable } from '../../helpers/getFieldsNameOfTable.js';

const {
  Op,
  Diamonds,
  DiamondsLots,
  SieveSize,
  Supplier,
  DiamondsLotsQRCodes,
  DiamondsGrades,
  DiamondsPayments,
} = db;
const addDiamonds = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const validation = new Validator(req.body, {
      supplier_id: 'required',
      // diamond_name: 'required',
      // shape: 'required',
      // color: 'required',
      // clarity: 'required',
      actual_price: 'required',
      discount_price: 'required',
      total_weight: 'required',
      // total_quantity: 'required',
      diamond_lots: 'required',
      invoice_number: 'required',
      payment_terms_day: 'required',
      paid_payemnt: 'required',
      diamond_type: 'required',
    });

    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      await transaction.rollback();
      return errorResponse(res, firstMessage);
    }

    const {
      diamond_name,
      shape,
      color,
      clarity,
      description,
      actual_price,
      discount_price,
      diamond_lots,
      supplier_id,
      total_weight,
      purchase_date,
      // total_quantity,
      invoice_number,
      payment_terms_day,
      paid_payemnt,
      diamond_type,
    } = req.body;

    const files = req.files;

    let invoice = null;
    if (files && files.length > 0) {
      let uploadedFile = await uploadFile(files[0], 'invoice');
      invoice = uploadedFile;
    }

    let diamondLots = JSON.parse(diamond_lots);

    //   diamondLots.reduce(
    //   (sum, item) =>
    //     sum +
    //     item.zero_point_twenty_five_carat_packet_count +
    //     item.zero_point_fifty_carat_packet_count +
    //     item.one_carat_packet_count,
    //   0
    // );
    let total_quantity = diamondLots.reduce((sum, item) => {
      return (
        sum +
        item.lots.reduce(
          (lotSum, lot) =>
            lotSum +
            (lot.zero_point_twenty_five_carat_packet_count || 0) +
            (lot.zero_point_fifty_carat_packet_count || 0) +
            (lot.one_carat_packet_count || 0),
          0
        )
      );
    }, 0);
    const date = new Date(purchase_date);
    date.setDate(date.getDate() + Number(payment_terms_day));

    const addedDiamonds = await Diamonds.create(
      {
        supplier_id: supplier_id,
        diamond_name: diamond_name,
        shape: shape,
        color: color,
        clarity: clarity,
        description: description || null,
        invoice: invoice,
        actual_price: actual_price,
        discount_price: discount_price,
        total_weight: total_weight,
        purchase_date: purchase_date || new Date(),
        total_quantity: total_quantity,
        invoice_number: invoice_number,
        payment_terms_day: payment_terms_day,
        due_date: date,
        paid_payemnt: paid_payemnt,
        pending_payment: Number(discount_price) - Number(paid_payemnt),
        diamond_type: diamond_type,
      },
      { transaction }
    );

    const addedDiamondsPayment = await DiamondsPayments.create(
      {
        diamond_id: addedDiamonds.id,
        amount: paid_payemnt,
        paid_payemnt: paid_payemnt,
        pending_payment: Number(discount_price) - Number(paid_payemnt),
      },
      { transaction }
    );

    //   diamondLots.reduce(
    //   (sum, item) => sum + item.total_quantity,
    //   0
    // );
    const sumOfTotalQuantity = diamondLots.reduce((sum, item) => {
      return (
        sum +
        item.lots.reduce((lotSum, lot) => lotSum + (lot.total_quantity || 0), 0)
      );
    }, 0);

    //   diamondLots.reduce(
    //   (sum, item) => sum + item.unpacked_quantity,
    //   0
    // );
    const sumOfTotalUnpackedQuantity = diamondLots.reduce((sum, item) => {
      return (
        sum +
        item.lots.reduce(
          (lotSum, lot) => lotSum + (lot.unpacked_quantity || 0),
          0
        )
      );
    }, 0);

    if (
      Number(sumOfTotalQuantity) + Number(sumOfTotalUnpackedQuantity) !=
      Number(total_weight)
    ) {
      await transaction.rollback();
      return errorResponse(res, 5006);
    }

    for (let diamondGrade of diamondLots) {
      const validation = new Validator(diamondGrade, {
        shape: 'required',
        color: 'required',
        clarity: 'required',
        lots: 'required',
      });

      if (validation.fails()) {
        const firstMessage = validation.errors.first(
          Object.keys(validation.errors.all())[0]
        );
        await transaction.rollback();
        return errorResponse(res, firstMessage);
      }
      const { shape, color, clarity, lots } = diamondGrade;

      let addedDiamondsGrade = await DiamondsGrades.create(
        {
          shape: shape,
          color: color,
          clarity: clarity,
          diamond_id: addedDiamonds.id,
        },
        { transaction }
      );
      for (let lot of lots) {
        const validation = new Validator(lot, {
          sieve_size: 'required',
          total_weight: 'required',
          zero_point_twenty_five_carat_packet_count: 'required',
          zero_point_twenty_five_carat_packet_weight: 'required',
          zero_point_fifty_carat_packet_count: 'required',
          zero_point_fifty_carat_packet_weight: 'required',
          one_carat_packet_count: 'required',
          one_carat_packet_weight: 'required',
          unpacked_quantity: 'required',
          total_quantity: 'required',
          //  price_per_carat: 'required',
        });

        if (validation.fails()) {
          const firstMessage = validation.errors.first(
            Object.keys(validation.errors.all())[0]
          );
          await transaction.rollback();
          return errorResponse(res, firstMessage);
        }
        const {
          sieve_size,
          total_weight,
          zero_point_twenty_five_carat_packet_count,
          zero_point_twenty_five_carat_packet_weight,
          zero_point_fifty_carat_packet_count,
          zero_point_fifty_carat_packet_weight,
          one_carat_packet_count,
          one_carat_packet_weight,
          unpacked_quantity,
          total_quantity,
          //  price_per_carat,
        } = lot;

        const checkSieveSize = await SieveSize.findOne({
          where: {
            id: sieve_size,
          },
        });
        if (!checkSieveSize) {
          await transaction.rollback();
          return errorResponse(res, 5005);
        }
        if (
          Number(zero_point_twenty_five_carat_packet_count) * 0.25 !=
            zero_point_twenty_five_carat_packet_weight ||
          Number(zero_point_fifty_carat_packet_count) * 0.5 !=
            zero_point_fifty_carat_packet_weight ||
          Number(one_carat_packet_count) * 1 != one_carat_packet_weight ||
          Number(unpacked_quantity) +
            Number(zero_point_twenty_five_carat_packet_count) +
            Number(zero_point_fifty_carat_packet_count) +
            Number(one_carat_packet_count) ==
            total_weight
        ) {
          await transaction.rollback();
          return errorResponse(res, 5006);
        }

        const addedDiamondLots = await DiamondsLots.create(
          {
            diamond_id: addedDiamonds.id,
            diamond_grade_id: addedDiamondsGrade.id,
            sieve_size: checkSieveSize.size,
            total_weight: total_weight,
            zero_point_twenty_five_carat_packet_count:
              zero_point_twenty_five_carat_packet_count,
            zero_point_twenty_five_carat_packet_weight:
              zero_point_twenty_five_carat_packet_weight,
            zero_point_fifty_carat_packet_count:
              zero_point_fifty_carat_packet_count,
            zero_point_fifty_carat_packet_weight:
              zero_point_fifty_carat_packet_weight,
            one_carat_packet_count: one_carat_packet_count,
            one_carat_packet_weight: one_carat_packet_weight,
            unpacked_quantity: unpacked_quantity,
            total_quantity: total_quantity,
            //  price_per_carat: price_per_carat,
          },
          { transaction }
        );

        if (zero_point_twenty_five_carat_packet_count > 0) {
          for (let i = 0; i < zero_point_twenty_five_carat_packet_count; i++) {
            await DiamondsLotsQRCodes.create(
              {
                diamond_lot_id: addedDiamondLots.id,
                diamond_id: addedDiamonds.id,
                weight: 0.25,
              },
              { transaction }
            );
          }
        }
        if (zero_point_fifty_carat_packet_count > 0) {
          for (let i = 0; i < zero_point_fifty_carat_packet_count; i++) {
            await DiamondsLotsQRCodes.create(
              {
                diamond_lot_id: addedDiamondLots.id,
                diamond_id: addedDiamonds.id,
                weight: 0.5,
              },
              { transaction }
            );
          }
        }
        if (one_carat_packet_count > 0) {
          for (let i = 0; i < one_carat_packet_count; i++) {
            await DiamondsLotsQRCodes.create(
              {
                diamond_lot_id: addedDiamondLots.id,
                diamond_id: addedDiamonds.id,
                weight: 1,
              },
              { transaction }
            );
          }
        }
      }
    }
    await transaction.commit();
    return successResponse(res, 5001);
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, 9999, error);
  }
};

const getDiamonds = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search,
      shape,
      sieve_size,
      clarity,
      color,
      sort_field = 'createdAt',
      sort_type = 'DESC',
    } = req.query;
    const offset = (page - 1) * limit;
    const { fields } = req.permission;

    const getDiamondsTableFields = await getFieldsNameOfTable(Diamonds);
    const getDiamondsLotsTableFields = await getFieldsNameOfTable(DiamondsLots);
    const getDiamondsGradesTableFields =
      await getFieldsNameOfTable(DiamondsGrades);

    const getPermissionFieldsOfDiamond = fields.filter((field) =>
      getDiamondsTableFields.includes(field)
    );
    const getPermissionFieldsOfDiamondLots = fields.filter((field) =>
      getDiamondsLotsTableFields.includes(field)
    );
    const getPermissionFieldsOfDiamondsGrades = fields.filter((field) =>
      getDiamondsGradesTableFields.includes(field)
    );

    const data = await DiamondsLots.findAndCountAll({
      attributes: getPermissionFieldsOfDiamondLots,
      where: {
        is_deleted: false,
        ...(sieve_size && {
          sieve_size: { [Op.substring]: `%${sieve_size}%` },
        }),
      },
      order: [[sort_field, sort_type]],
      limit: limit,
      offset: offset,
      include: [
        {
          model: Diamonds,
          attributes: getPermissionFieldsOfDiamond,
          where: {
            is_deleted: false,
            ...(search && {
              [Op.or]: [
                // { diamond_name: { [Op.substring]: `%${search}%` } },
                { description: { [Op.substring]: `%${search}%` } },
              ],
            }),
          },
        },
        {
          model: DiamondsGrades,
          attributes: getPermissionFieldsOfDiamondsGrades,
          where: {
            is_deleted: false,
            ...(shape && { shape: { [Op.substring]: `%${shape}%` } }),
            ...(clarity && { clarity: { [Op.substring]: `%${clarity}%` } }),
            ...(color && { color: { [Op.substring]: `%${color}%` } }),
          },
        },
      ],
    });

    const paginationData = await pagination(data.count, page, limit);
    let response = {
      paginationData,
      diamonds: data.rows,
    };
    return successResponse(res, 5002, response);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const getDiamondsQRCodes = async (req, res) => {
  try {
    const validation = new Validator(req.query, {
      diamond_id: 'required',
      diamond_lot_id: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    let {
      page = 1,
      limit = 10,
      diamond_id,
      diamond_lot_id,
      sort_field = 'createdAt',
      sort_type = 'DESC',
    } = req.query;
    const offset = (page - 1) * limit;
    const { fields } = req.permission;

    const data = await DiamondsLotsQRCodes.findAndCountAll({
      attributes: fields,
      where: {
        is_deleted: false,
        diamond_id,
        diamond_lot_id,
      },
      limit: limit,
      offset: offset,
      order: [[sort_field, sort_type]],
    });
    const paginationData = await pagination(data.count, page, limit);
    let response = {
      paginationData,
      diamonds: data.rows,
    };
    return successResponse(res, 5010, response);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};
const deleteDiamonds = async (req, res) => {
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
    const checkExistDiamond = await Diamonds.findOne({
      where: {
        id,
      },
    });

    if (!checkExistDiamond) {
      return errorResponse(res, 5003);
    }
    await Diamonds.update({ is_deleted: true }, { where: { id: id } });
    return successResponse(res, 5007);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const getPurchaseHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      shape,
      clarity,
      color,
      sort_field = 'createdAt',
      sort_type = 'DESC',
    } = req.query;
    const offset = (page - 1) * limit;
    const { fields } = req.permission;

    const getDiamondsTableFields = await getFieldsNameOfTable(Diamonds);
    const getSupplierTableFields = await getFieldsNameOfTable(Supplier);

    const getPermissionFieldsOfDiamond = fields.filter((field) =>
      getDiamondsTableFields.includes(field)
    );
    const getPermissionFieldsOfSupplier = fields.filter((field) =>
      getSupplierTableFields.includes(field)
    );

    const data = await Diamonds.findAndCountAll({
      attributes: getPermissionFieldsOfDiamond,
      where: {
        is_deleted: false,
        ...(search && {
          [Op.or]: [
            { diamond_name: { [Op.substring]: `%${search}%` } },
            { description: { [Op.substring]: `%${search}%` } },
          ],
        }),
        ...(shape && { shape: { [Op.substring]: `%${shape}%` } }),
        ...(clarity && { clarity: { [Op.substring]: `%${clarity}%` } }),
        ...(color && { color: { [Op.substring]: `%${color}%` } }),
      },
      order: [[sort_field, sort_type]],
      limit: limit,
      offset: offset,
      include: {
        model: Supplier,
        attributes: getPermissionFieldsOfSupplier,
      },
    });

    const paginationData = await pagination(data.count, page, limit);
    let response = {
      paginationData,
      purchaseHistory: data.rows,
    };
    return successResponse(res, 5008, response);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const updateStoreDiamondsActiveInactive = async (req, res) => {
  try {
    const validation = new Validator(req.body, {
      id: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }
    const { id } = req.body;
    const checkExistDiamond = await Diamonds.findOne({
      where: {
        id,
        is_deleted: false,
      },
    });
    if (!checkExistDiamond) {
      return errorResponse(res, 5003);
    }

    checkExistDiamond.is_active_for_store =
      !checkExistDiamond.is_active_for_store;
    await checkExistDiamond.save();

    let response = {
      is_active_for_store: checkExistDiamond.is_active_for_store,
    };

    return successResponse(res, 5009, response);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

export default {
  addDiamonds,
  getDiamonds,
  getDiamondsQRCodes,
  deleteDiamonds,
  getPurchaseHistory,
  updateStoreDiamondsActiveInactive,
};
