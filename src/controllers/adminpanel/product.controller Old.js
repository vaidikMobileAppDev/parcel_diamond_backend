import { errorResponse, successResponse } from '../../helpers/response.js';
import Validator from 'validatorjs';
import db from '../../config/db.config.js';
import { pagination } from '../../helpers/pagination.js';
import { uploadFile } from '../../helpers/image.js';
import { getFieldsNameOfTable } from '../../helpers/getFieldsNameOfTable.js';
import { generateRandomString } from '../../helpers/crypto.js';
import moment from 'moment';

const {
  Op,
  fn,
  col,
  Diamonds,
  DiamondsLots,
  SieveSize,
  Supplier,
  DiamondsLotsQRCodes,
  DiamondsGrades,
  DiamondsPayments,
  Grades,
} = db;

// ---------- helpers for allocation & packets ----------
function expandLotToPackets(lot) {
  const packets = [];
  const pushN = (count, w) => {
    for (let i = 0; i < Number(count || 0); i++)
      packets.push({ weight: Number(w) });
  };
  pushN(lot.zero_point_twenty_five_carat_packet_count, 0.25);
  pushN(lot.zero_point_fifty_carat_packet_count, 0.5);
  pushN(lot.one_carat_packet_count, 1.0);
  if (Number(lot.unpacked_quantity || 0) > 0) {
    packets.push({ weight: Number(lot.unpacked_quantity) });
  }
  return packets;
}

function expandDiamondLotsToPackets(diamondLots) {
  const expanded = [];
  for (const grade of diamondLots) {
    for (const lot of grade.lots) {
      const packets = expandLotToPackets(lot);
      // attach grade/lot-level metadata to each packet
      for (const pkt of packets) {
        pkt.shape = grade.shape;
        pkt.color = grade.color;
        pkt.clarity = grade.clarity;
        pkt.sieve_size = lot.sieve_size;
        pkt.origLot = lot;
        expanded.push(pkt);
      }
    }
  }
  return expanded;
}

function sumQueueRem(queue) {
  return queue.reduce((s, q) => s + Number(q.rem || 0), 0);
}

function consumeFromQueueFIFO(queue, amount, contribs, side) {
  let remaining = Number(amount);
  while (remaining > 0 && queue.length) {
    const cur = queue[0];
    const take = Math.min(Number(cur.rem), remaining);
    const c = {
      source_qr_id: cur.source_qr_id,
      source_diamond_lot_id: cur.source_diamond_lot_id,
      from_on_book: side === 'on' ? Number(take) : 0,
      from_off_book: side === 'off' ? Number(take) : 0,
    };
    contribs.push(c);
    cur.rem = Number(cur.rem) - Number(take);
    remaining = Number(remaining) - Number(take);
    if (Number(cur.rem) <= 0) queue.shift();
  }
  return remaining;
}

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
      paid_payment: 'required',
      diamond_type: 'required',
      is_on_book: 'required|in:true,false',
      buy_time_currency_type: 'required',
      buy_time_currency_value: 'required',
      purchase_location: 'required',
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
      paid_payment,
      diamond_type,
      payment_type,
      is_on_book,
      buy_time_currency_type,
      buy_time_currency_value,
      purchase_location,
    } = req.body;

    if (parseFloat(actual_price) < parseFloat(discount_price)) {
      await transaction.rollback();
      return errorResponse(res, 5020);
    }
    if (parseFloat(discount_price) < parseFloat(paid_payment)) {
      await transaction.rollback();
      return errorResponse(res, 5021);
    }

    let diamond_lot_ids = [];
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
        paid_payment: paid_payment,
        pending_payment: Number(discount_price) - Number(paid_payment),
        diamond_type: diamond_type,
        is_on_book: is_on_book,
        buy_time_currency_type: buy_time_currency_type,
        buy_time_currency_value: buy_time_currency_value,
        purchase_location: purchase_location,
      },
      { transaction }
    );

    const addedDiamondsPayment = await DiamondsPayments.create(
      {
        diamond_id: addedDiamonds.id,
        amount: paid_payment,
        paid_payment: paid_payment,
        pending_payment: Number(discount_price) - Number(paid_payment),
        payment_type,
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
      if (
        Number(sumOfTotalQuantity) + Number(sumOfTotalUnpackedQuantity) >
        Number(total_weight)
      ) {
        console.log('sumOfTotalQuantity', sumOfTotalQuantity);
        console.log('sumOfTotalUnpackedQuantity', sumOfTotalUnpackedQuantity);
        return errorResponse(res, 5012);
      } else if (
        Number(sumOfTotalQuantity) + Number(sumOfTotalUnpackedQuantity) <
        Number(total_weight)
      ) {
        return errorResponse(res, 5011);
      }
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

      let checkExistGradesElseCreate = await Grades.findOne({
        where: {
          shape: shape,
          color: color,
          clarity: clarity,
          is_deleted: false,
        },
      });

      if (!checkExistGradesElseCreate) {
        checkExistGradesElseCreate = await Grades.create(
          {
            shape: shape,
            color: color,
            clarity: clarity,
          },
          { transaction }
        );
      }

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
          Number(
            Number(zero_point_twenty_five_carat_packet_count) * Number(0.25)
          ) != Number(zero_point_twenty_five_carat_packet_weight) ||
          Number(Number(zero_point_fifty_carat_packet_count) * Number(0.5)) !=
            zero_point_fifty_carat_packet_weight ||
          Number(Number(one_carat_packet_count) * Number(1)) !=
            Number(one_carat_packet_weight) ||
          Number(unpacked_quantity) +
            Number(zero_point_twenty_five_carat_packet_weight) +
            Number(zero_point_fifty_carat_packet_weight) +
            Number(one_carat_packet_weight) !=
            Number(total_weight)
        ) {
          await transaction.rollback();
          return errorResponse(res, 5006);
        }

        const checkExistDiamondsLots = await DiamondsLots.findOne({
          where: {
            purchase_location: purchase_location,
            grade_id: checkExistGradesElseCreate.id,
            sieve_size: checkSieveSize.size,
            is_on_book: is_on_book,
            is_deleted: false,
          },
        });

        let addedDiamondLots;
        if (checkExistDiamondsLots) {
          await DiamondsLots.update(
            {
              grade_id: checkExistGradesElseCreate.id,
              purchase_location: purchase_location,
              sieve_size: checkSieveSize.size,
              is_on_book: is_on_book,
              total_weight:
                Number(checkExistDiamondsLots.total_weight) +
                Number(total_weight),
              zero_point_twenty_five_carat_packet_count:
                Number(
                  checkExistDiamondsLots.zero_point_twenty_five_carat_packet_count
                ) + Number(zero_point_twenty_five_carat_packet_count),
              zero_point_twenty_five_carat_packet_weight:
                Number(
                  checkExistDiamondsLots.zero_point_twenty_five_carat_packet_weight
                ) + Number(zero_point_twenty_five_carat_packet_weight),
              zero_point_fifty_carat_packet_count:
                Number(
                  checkExistDiamondsLots.zero_point_fifty_carat_packet_count
                ) + Number(zero_point_fifty_carat_packet_count),
              zero_point_fifty_carat_packet_weight:
                Number(
                  checkExistDiamondsLots.zero_point_fifty_carat_packet_weight
                ) + Number(zero_point_fifty_carat_packet_weight),
              one_carat_packet_count:
                Number(checkExistDiamondsLots.one_carat_packet_count) +
                Number(one_carat_packet_count),
              one_carat_packet_weight:
                Number(checkExistDiamondsLots.one_carat_packet_weight) +
                Number(one_carat_packet_weight),
              unpacked_quantity:
                Number(checkExistDiamondsLots.unpacked_quantity) +
                Number(unpacked_quantity),
              total_quantity:
                Number(checkExistDiamondsLots.total_quantity) +
                Number(total_quantity),
            },
            {
              where: {
                id: checkExistDiamondsLots.id,
              },
              transaction,
            }
          );
          addedDiamondLots = checkExistDiamondsLots;
        } else {
          addedDiamondLots = await DiamondsLots.create(
            {
              // diamond_id: addedDiamonds.id,
              grade_id: checkExistGradesElseCreate.id,
              purchase_location: purchase_location,
              sieve_size: checkSieveSize.size,
              is_on_book: is_on_book,
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
        }

        const checkExistTotalDiamondsLots = await DiamondsLots.findOne({
          where: {
            purchase_location: purchase_location,
            grade_id: checkExistGradesElseCreate.id,
            sieve_size: checkSieveSize.size,
            is_on_book: 'total',
            is_deleted: false,
          },
        });
        let addedTotalInventoryDiamondLots;
        if (checkExistTotalDiamondsLots) {
          await DiamondsLots.update(
            {
              grade_id: checkExistGradesElseCreate.id,
              purchase_location: purchase_location,
              sieve_size: checkSieveSize.size,
              is_on_book: 'total',
              total_weight:
                Number(checkExistTotalDiamondsLots.total_weight) +
                Number(total_weight),
              zero_point_twenty_five_carat_packet_count:
                Number(
                  checkExistTotalDiamondsLots.zero_point_twenty_five_carat_packet_count
                ) + Number(zero_point_twenty_five_carat_packet_count),
              zero_point_twenty_five_carat_packet_weight:
                Number(
                  checkExistTotalDiamondsLots.zero_point_twenty_five_carat_packet_weight
                ) + Number(zero_point_twenty_five_carat_packet_weight),
              zero_point_fifty_carat_packet_count:
                Number(
                  checkExistTotalDiamondsLots.zero_point_fifty_carat_packet_count
                ) + Number(zero_point_fifty_carat_packet_count),
              zero_point_fifty_carat_packet_weight:
                Number(
                  checkExistTotalDiamondsLots.zero_point_fifty_carat_packet_weight
                ) + Number(zero_point_fifty_carat_packet_weight),
              one_carat_packet_count:
                Number(checkExistTotalDiamondsLots.one_carat_packet_count) +
                Number(one_carat_packet_count),
              one_carat_packet_weight:
                Number(checkExistTotalDiamondsLots.one_carat_packet_weight) +
                Number(one_carat_packet_weight),
              unpacked_quantity:
                Number(checkExistTotalDiamondsLots.unpacked_quantity) +
                Number(unpacked_quantity),
              total_quantity:
                Number(checkExistTotalDiamondsLots.total_quantity) +
                Number(total_quantity),
            },
            {
              where: {
                id: checkExistTotalDiamondsLots.id,
              },
              transaction,
            }
          );
          addedTotalInventoryDiamondLots = checkExistTotalDiamondsLots;
        } else {
          addedTotalInventoryDiamondLots = await DiamondsLots.create(
            {
              // diamond_id: addedDiamonds.id,
              grade_id: checkExistGradesElseCreate.id,
              purchase_location: purchase_location,
              sieve_size: checkSieveSize.size,
              is_on_book: 'total',
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
        }

        let addedDiamondsGrade = await DiamondsGrades.create(
          {
            // shape: shape,
            // color: color,
            // clarity: clarity,
            diamond_lot_id: addedDiamondLots.id,
            grade_id: checkExistGradesElseCreate.id,
            diamond_id: addedDiamonds.id,
          },
          { transaction }
        );
        diamond_lot_ids.push(addedDiamondLots.id);
        if (zero_point_twenty_five_carat_packet_count > 0) {
          for (let i = 0; i < zero_point_twenty_five_carat_packet_count; i++) {
            // let string_code = await generateRandomString(5);
            const createdQrCode = await DiamondsLotsQRCodes.create(
              {
                diamond_lot_id: addedDiamondLots.id,
                total_diamond_lot_id: addedTotalInventoryDiamondLots.id,
                diamond_id: addedDiamonds.id,
                grade_id: checkExistGradesElseCreate.id,
                // string_code: `${addedDiamonds.id}-${addedDiamondLots.id}-${string_code}-${is_on_book}`,
                is_on_book: is_on_book,
                weight: 0.25,
                ...(is_on_book === 'true' && { on_book_weight: 0.25 }),
                ...(is_on_book === 'false' && { off_book_weight: 0.25 }),
              },
              { transaction }
            );
            await DiamondsLotsQRCodes.update(
              {
                string_code: `${createdQrCode.id}-${is_on_book === 'true' ? '1' : '0'}`,
              },
              {
                where: {
                  id: createdQrCode.id,
                },
                transaction,
              }
            );
          }
        }
        if (zero_point_fifty_carat_packet_count > 0) {
          for (let i = 0; i < zero_point_fifty_carat_packet_count; i++) {
            // let string_code = await generateRandomString(5);
            const createdQrCode = await DiamondsLotsQRCodes.create(
              {
                diamond_lot_id: addedDiamondLots.id,
                total_diamond_lot_id: addedTotalInventoryDiamondLots.id,
                diamond_id: addedDiamonds.id,
                grade_id: checkExistGradesElseCreate.id,
                // string_code: `${addedDiamonds.id}-${addedDiamondLots.id}-${string_code}-${is_on_book}`,
                is_on_book: is_on_book,
                weight: 0.5,
                ...(is_on_book === 'true' && { on_book_weight: 0.5 }),
                ...(is_on_book === 'false' && { off_book_weight: 0.5 }),
              },
              { transaction }
            );
            await DiamondsLotsQRCodes.update(
              {
                string_code: `${createdQrCode.id}-${is_on_book === 'true' ? '1' : '0'}`,
              },
              {
                where: {
                  id: createdQrCode.id,
                },
                transaction,
              }
            );
          }
        }
        if (one_carat_packet_count > 0) {
          for (let i = 0; i < one_carat_packet_count; i++) {
            // let string_code = await generateRandomString(5);
            const createdQrCode = await DiamondsLotsQRCodes.create(
              {
                diamond_lot_id: addedDiamondLots.id,
                total_diamond_lot_id: addedTotalInventoryDiamondLots.id,
                diamond_id: addedDiamonds.id,
                grade_id: checkExistGradesElseCreate.id,
                // string_code: `${addedDiamonds.id}-${addedDiamondLots.id}-${string_code}-${is_on_book}`,
                is_on_book: is_on_book,
                weight: 1,
                ...(is_on_book === 'true' && { on_book_weight: 1 }),
                ...(is_on_book === 'false' && { off_book_weight: 1 }),
              },
              { transaction }
            );
            await DiamondsLotsQRCodes.update(
              {
                string_code: `${createdQrCode.id}-${is_on_book === 'true' ? '1' : '0'}`,
              },
              {
                where: {
                  id: createdQrCode.id,
                },
                transaction,
              }
            );
          }
        }
        if (unpacked_quantity > 0) {
          // let string_code = await generateRandomString(5);
          const createdQrCode = await DiamondsLotsQRCodes.create(
            {
              diamond_lot_id: addedDiamondLots.id,
              total_diamond_lot_id: addedTotalInventoryDiamondLots.id,
              diamond_id: addedDiamonds.id,
              grade_id: checkExistGradesElseCreate.id,
              // string_code: `${addedDiamonds.id}-${addedDiamondLots.id}-${string_code}-${is_on_book}`,
              is_on_book: is_on_book,
              weight: unpacked_quantity,
              ...(is_on_book === 'true' && {
                on_book_weight: unpacked_quantity,
              }),
              ...(is_on_book === 'false' && {
                off_book_weight: unpacked_quantity,
              }),
            },
            { transaction }
          );
          await DiamondsLotsQRCodes.update(
            {
              string_code: `${createdQrCode.id}-${is_on_book === 'true' ? '1' : '0'}`,
            },
            {
              where: {
                id: createdQrCode.id,
              },
              transaction,
            }
          );
        }
      }
    }
    await transaction.commit();

    const getDiamondDetails = await Diamonds.findOne({
      attributes: ['id'],
      where: {
        id: addedDiamonds.id,
      },
      // include: [
      //   {
      //     model: DiamondsLots,
      //     attributes: ['id'],
      include: [
        {
          model: DiamondsGrades,
          // attributes: ['shape', 'color', 'clarity'],
          include: [
            {
              model: Grades,
              attributes: ['shape', 'color', 'clarity'],
            },
          ],
        },
      ],
      //   },
      // ],
    });
    let response = {
      diamonds: getDiamondDetails,
    };
    return successResponse(res, 5001, response);
  } catch (error) {
    console.log('error', error);
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
      purchase_location,
      is_on_book,
      start_date,
      end_date,
      sort_field = 'createdAt',
      sort_type = 'DESC',
    } = req.query;
    const offset = (page - 1) * limit;
    const { fields } = req.permission;

    if (!fields.includes('is_show_on_book_record')) {
      is_on_book = is_on_book;
    } else {
      is_on_book = 'true';
    }

    const getDiamondsTableFields = await getFieldsNameOfTable(Diamonds);
    const getDiamondsLotsTableFields = await getFieldsNameOfTable(DiamondsLots);
    const getDiamondsGradesTableFields =
      await getFieldsNameOfTable(DiamondsGrades);

    const getPermissionFieldsOfDiamond = fields.filter((field) =>
      getDiamondsTableFields.includes(field)
    );

    const extraFieldsOfDiamondLots = [
      'zero_point_twenty_five_carat_packet_count',
      'zero_point_twenty_five_carat_packet_weight',
      'zero_point_fifty_carat_packet_count',
      'zero_point_fifty_carat_packet_weight',
      'one_carat_packet_count',
      'one_carat_packet_weight',
      'unpacked_quantity',
    ];
    let getPermissionFieldsOfDiamondLots = fields.filter((field) =>
      getDiamondsLotsTableFields.includes(field)
    );
    if (!fields.includes('is_show_quantity')) {
      getPermissionFieldsOfDiamondLots =
        getPermissionFieldsOfDiamondLots.filter(
          (field) => !extraFieldsOfDiamondLots.includes(field)
        );
    }

    const getPermissionFieldsOfDiamondsGrades = fields.filter((field) =>
      getDiamondsGradesTableFields.includes(field)
    );

    const data = await DiamondsLots.findAndCountAll({
      distinct: true,
      attributes: getPermissionFieldsOfDiamondLots,
      where: {
        is_deleted: false,
        is_on_book: `${is_on_book}`,
        ...(sieve_size && {
          sieve_size: { [Op.substring]: `%${sieve_size}%` },
        }),
        ...(purchase_location && {
          purchase_location: { [Op.substring]: `%${purchase_location}%` },
        }),
        ...(start_date &&
          end_date && {
            createdAt: {
              [Op.between]: [
                moment(start_date, 'YYYY-MM-DD HH:mm:ss.SSZZ').toDate(),
                moment(end_date, 'YYYY-MM-DD HH:mm:ss.SSZZ').toDate(),
              ],
            },
          }),
      },
      order: [[sort_field, sort_type]],
      limit: limit,
      offset: offset,
      include: [
        //   {
        //     model: Diamonds,
        //     attributes: getPermissionFieldsOfDiamond,
        //     where: {
        //       is_deleted: false,
        //       ...(search && {
        //         [Op.or]: [
        //           // { diamond_name: { [Op.substring]: `%${search}%` } },
        //           { description: { [Op.substring]: `%${search}%` } },
        //         ],
        //       }),
        //     },
        //   },
        {
          model: DiamondsGrades,
          attributes: getPermissionFieldsOfDiamondsGrades,
          where: {
            is_deleted: false,
            // ...(shape && { shape: { [Op.substring]: `%${shape}%` } }),
            // ...(clarity && { clarity: { [Op.substring]: `%${clarity}%` } }),
            // ...(color && { color: { [Op.substring]: `%${color}%` } }),
          },
          required: false,
        },
        {
          model: Grades,
          where: {
            is_deleted: false,
            ...(shape && { shape: { [Op.substring]: `%${shape}%` } }),
            ...(clarity && { clarity: { [Op.substring]: `%${clarity}%` } }),
            ...(color && { color: { [Op.substring]: `%${color}%` } }),
          },
        },
      ],
    });

    let monthlyDetails;
    if (fields.includes('is_show_statistics_of_diamonds_on_top')) {
      const gradeIds = await Grades.findAll({
        attributes: ['id'],
        where: {
          is_deleted: false,
          ...(shape && { shape: { [Op.substring]: `%${shape}%` } }),
          ...(clarity && { clarity: { [Op.substring]: `%${clarity}%` } }),
          ...(color && { color: { [Op.substring]: `%${color}%` } }),
        },
        raw: true,
      }).then((rows) => rows.map((r) => r.id));

      // then apply as filter in DiamondsLots
      monthlyDetails = await DiamondsLots.findAll({
        attributes: [
          [
            fn('SUM', col('zero_point_twenty_five_carat_packet_count')),
            'sum_zero_point_twenty_five_carat_packet_count',
          ],
          [
            fn('SUM', col('zero_point_twenty_five_carat_packet_weight')),
            'sum_zero_point_twenty_five_carat_packet_weight',
          ],
          [
            fn('SUM', col('zero_point_fifty_carat_packet_count')),
            'sum_zero_point_fifty_carat_packet_count',
          ],
          [
            fn('SUM', col('zero_point_fifty_carat_packet_weight')),
            'sum_zero_point_fifty_carat_packet_weight',
          ],
          [
            fn('SUM', col('one_carat_packet_count')),
            'sum_one_carat_packet_count',
          ],
          [
            fn('SUM', col('one_carat_packet_weight')),
            'sum_one_carat_packet_weight',
          ],
          [fn('SUM', col('unpacked_quantity')), 'sum_unpacked_quantity'],
          [fn('SUM', col('total_quantity')), 'sum_total_quantity'],
          [fn('SUM', col('total_weight')), 'sum_total_weight'],
        ],
        where: {
          is_deleted: false,
          is_on_book: `${is_on_book}`,
          ...(sieve_size && {
            sieve_size: { [Op.substring]: `%${sieve_size}%` },
          }),
          ...(purchase_location && {
            purchase_location: { [Op.substring]: `%${purchase_location}%` },
          }),
          ...(start_date &&
            end_date && {
              createdAt: {
                [Op.between]: [
                  moment(start_date, 'YYYY-MM-DD HH:mm:ss.SSZZ').toDate(),
                  moment(end_date, 'YYYY-MM-DD HH:mm:ss.SSZZ').toDate(),
                ],
              },
            }),
          ...(gradeIds.length > 0 && { grade_id: { [Op.in]: gradeIds } }), // ✅ filter by IDs instead of join
        },
        raw: true,
      });
    }

    const paginationData = await pagination(data.count, page, limit);
    let response = {
      paginationData,
      ...(monthlyDetails && { monthlyDetails }),
      diamonds: data.rows,
    };
    return successResponse(res, 5002, response);
  } catch (error) {
    return errorResponse(res, 9999, error);
  }
};

const getDiamondsQRCodes = async (req, res) => {
  try {
    // const validation = new Validator(req.query, {
    //   // diamond_id: 'required',
    //   diamond_lot_id: 'required',
    // });
    // if (validation.fails()) {
    //   const firstMessage = validation.errors.first(
    //     Object.keys(validation.errors.all())[0]
    //   );
    //   return errorResponse(res, firstMessage);
    // }

    let {
      // page = 1,
      // limit = 10,
      diamond_id,
      diamond_lot_id,
      search,
      sort_field = 'createdAt',
      sort_type = 'DESC',
    } = req.query;
    // const offset = (page - 1) * limit;
    const { fields } = req.permission;

    const getDiamondsLotsQRCodesTableFields =
      await getFieldsNameOfTable(DiamondsLotsQRCodes);

    const getPermissionFieldsOfDiamondsLotsQRCodes = fields.filter((field) =>
      getDiamondsLotsQRCodesTableFields.includes(field)
    );

    const data = await DiamondsLotsQRCodes.findAndCountAll({
      attributes: getPermissionFieldsOfDiamondsLotsQRCodes,
      where: {
        is_deleted: false,
        ...(diamond_id && { diamond_id }),
        ...(diamond_lot_id && { diamond_lot_id }),
        ...(search && {
          [Op.or]: [{ string_code: { [Op.substring]: `%${search}%` } }],
        }),
      },
      include: [
        {
          model: Grades,
          attributes: ['shape', 'color', 'clarity'],
        },
      ],
      // include: [
      //   {
      //     model: DiamondsLots,
      //     attributes: ['id'],
      //     include: [
      //       {
      //         model: DiamondsGrades,
      //         where: {
      //           is_deleted: false,
      //           // diamond_id,
      //           diamond_lot_id,
      //         },
      //         include: [
      //           {
      //             model: Grades,
      //             attributes: ['shape', 'color', 'clarity'],
      //           },
      //         ],
      //       },
      //     ],
      //   },
      // ],
      // limit: limit,
      // offset: offset,
      order: [[sort_field, sort_type]],
    });
    // const paginationData = await pagination(data.count, page, limit);
    let response = {
      // paginationData,
      diamonds: data.rows,
    };
    return successResponse(res, 5010, response);
  } catch (error) {
    console.log('error', error);
    return errorResponse(res, 9999, error);
  }
};
const scanDiamondsQRCodes = async (req, res) => {
  try {
    const validation = new Validator(req.query, {
      // diamond_id: 'required',
      diamond_qr_id: 'required',
    });
    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    let {
      // diamond_id,
      diamond_qr_id,
    } = req.query;
    // const { fields } = req.permission;

    const data = await DiamondsLotsQRCodes.findOne({
      attributes: [
        'id',
        'diamond_id',
        'diamond_lot_id',
        'grade_id',
        'weight',
        'is_unpacked',
      ],
      where: {
        id: diamond_qr_id,
        // ...(diamond_qr_id && { id: diamond_qr_id }),
        is_deleted: false,
        // ...(diamond_id && { diamond_id }),
      },
      include: [
        {
          model: Grades,
          attributes: ['shape', 'color', 'clarity'],
        },
        {
          model: DiamondsLots,
          attributes: ['purchase_location'],
        },
      ],
      // include: [
      //   {
      //     model: DiamondsLots,
      //     attributes: ['id'],
      //     include: [
      //       {
      //         model: DiamondsGrades,
      //         // where: {
      //         //   id: diamond_qr_id,
      //         //   is_deleted: false,
      //           // diamond_id,
      //         // },
      //         include: [
      //           {
      //             model: Grades,
      //             attributes: ['shape', 'color', 'clarity'],
      //           },
      //         ],
      //       },
      //     ],
      //   },
      // ],
    });

    if (data.is_unpacked) {
      return errorResponse(res, 5014);
    }
    let response = {
      diamonds: data,
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
    let {
      page = 1,
      limit = 10,
      search,
      shape,
      clarity,
      color,
      purchase_location,
      is_on_book,
      start_date,
      end_date,
      sort_field = 'createdAt',
      sort_type = 'DESC',
    } = req.query;
    const offset = (page - 1) * limit;
    const { fields } = req.permission;

    if (!fields.includes('is_show_on_book_record')) {
      is_on_book = is_on_book;
    } else {
      is_on_book = 'true';
    }

    const getDiamondsTableFields = await getFieldsNameOfTable(Diamonds);
    const getSupplierTableFields = await getFieldsNameOfTable(Supplier);
    const getDiamondsGradesTableFields =
      await getFieldsNameOfTable(DiamondsGrades);
    const getDiamondsPaymentsTableFields =
      await getFieldsNameOfTable(DiamondsPayments);

    const getPermissionFieldsOfDiamond = fields.filter((field) =>
      getDiamondsTableFields.includes(field)
    );
    const getPermissionFieldsOfSupplier = fields.filter((field) =>
      getSupplierTableFields.includes(field)
    );
    const getPermissionFieldsOfDiamondsGrades = fields.filter((field) =>
      getDiamondsGradesTableFields.includes(field)
    );
    const getPermissionFieldsOfDiamondsPayments = fields.filter((field) =>
      getDiamondsPaymentsTableFields.includes(field)
    );

    const data = await Diamonds.findAndCountAll({
      distinct: true,
      attributes: getPermissionFieldsOfDiamond,
      where: {
        is_deleted: false,
        ...(search && {
          [Op.or]: [
            // { diamond_name: { [Op.substring]: `%${search}%` } },
            { description: { [Op.substring]: `%${search}%` } },
          ],
        }),
        ...(purchase_location && {
          purchase_location: { [Op.substring]: `%${purchase_location}%` },
        }),

        is_on_book: `${is_on_book}`,
      },
      order: [[sort_field, sort_type]],
      limit: limit,
      offset: offset,
      include: [
        {
          model: Supplier,
          attributes: getPermissionFieldsOfSupplier,
        },
        {
          model: DiamondsGrades,
          attributes: getPermissionFieldsOfDiamondsGrades,
          include: [
            {
              model: Grades,
              where: {
                ...(shape && { shape: { [Op.substring]: `%${shape}%` } }),
                ...(clarity && { clarity: { [Op.substring]: `%${clarity}%` } }),
                ...(color && { color: { [Op.substring]: `%${color}%` } }),
              },
            },
          ],
        },
        {
          model: DiamondsPayments,
          attributes: getPermissionFieldsOfDiamondsPayments,
        },
      ],
    });

    let monthlyDetails;
    if (fields.includes('is_show_statistics_of_diamonds_on_top')) {
      let gradeIds;
      if (shape || clarity || color) {
        gradeIds = await Grades.findAll({
          attributes: ['id'],
          where: {
            ...(shape && { shape: { [Op.substring]: `%${shape}%` } }),
            ...(clarity && { clarity: { [Op.substring]: `%${clarity}%` } }),
            ...(color && { color: { [Op.substring]: `%${color}%` } }),
            is_deleted: false,
          },
          raw: true,
        }).then((rows) => rows.map((r) => r.id));
      }

      monthlyDetails = await Diamonds.findAll({
        attributes: [
          [fn('SUM', col('diamonds.paid_payment')), 'sum_paid_payment'],
          [fn('SUM', col('diamonds.pending_payment')), 'sum_pending_payment'],
          [fn('SUM', col('diamonds.total_weight')), 'sum_total_weight'],
          [fn('SUM', col('diamonds.discount_price')), 'sum_discount_price'],
          [fn('SUM', col('diamonds.actual_price')), 'sum_actual_price'],
        ],
        where: {
          is_deleted: false,
          ...(search && { description: { [Op.substring]: `%${search}%` } }),
          ...(start_date &&
            end_date && {
              createdAt: {
                [Op.between]: [
                  moment(start_date, 'YYYY-MM-DD HH:mm:ss.SSZZ').toDate(),
                  moment(end_date, 'YYYY-MM-DD HH:mm:ss.SSZZ').toDate(),
                ],
              },
            }),
          ...(purchase_location && {
            purchase_location: { [Op.substring]: `%${purchase_location}%` },
          }),
          is_on_book,
          ...(gradeIds &&
            gradeIds?.length > 0 && {
              id: {
                [Op.in]: db.Sequelize.literal(`(
          SELECT "diamond_id"
          FROM "diamonds_grades"
          WHERE "grade_id" IN (${gradeIds.join(',')})
        )`),
              },
            }),
        },
        raw: true,
      });
    }
    const paginationData = await pagination(data.count, page, limit);
    let response = {
      paginationData,
      ...(monthlyDetails && { monthlyDetails }),
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

const unpackDiamondsLot = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const validation = new Validator(req.body, {
      unpacked_qr_code_ids: 'required',
      diamond_lots: 'required',
    });

    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      await transaction.rollback();
      return errorResponse(res, firstMessage);
    }

    let { unpacked_qr_code_ids, diamond_lots } = req.body;

    unpacked_qr_code_ids = JSON.parse(unpacked_qr_code_ids);
    const diamondLots = JSON.parse(diamond_lots);

    const sourceQrs = await db.DiamondsLotsQRCodes.findAll({
      where: {
        id: { [Op.in]: unpacked_qr_code_ids },
        is_deleted: false,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!sourceQrs || sourceQrs.length !== unpacked_qr_code_ids.length) {
      await transaction.rollback();
      return errorResponse(res, 5013);
    }

    for (const s of sourceQrs) {
      if (s.is_unpacked) {
        await transaction.rollback();
        return errorResponse(res, 5014);
      }
    }

    const onBookQueue = [];
    const offBookQueue = [];

    for (const s of sourceQrs) {
      const weightNum = Number(s.weight || 0);
      const onW =
        s.on_book_weight != null
          ? Number(s.on_book_weight)
          : s.is_on_book === 'true'
            ? weightNum
            : 0;
      const offW =
        s.off_book_weight != null
          ? Number(s.off_book_weight)
          : s.is_on_book === 'false'
            ? weightNum
            : 0;

      if (onW > 0)
        onBookQueue.push({
          source_qr_id: s.id,
          rem: onW,
          source_diamond_lot_id: s.diamond_lot_id,
        });
      if (offW > 0)
        offBookQueue.push({
          source_qr_id: s.id,
          rem: offW,
          source_diamond_lot_id: s.diamond_lot_id,
        });
    }

    const availableTotal = sumQueueRem(onBookQueue) + sumQueueRem(offBookQueue);

    const packets = expandDiamondLotsToPackets(diamondLots);
    const requestedTotal = packets.reduce(
      (s, p) => s + Number(p.weight || 0),
      0
    );

    if (Number(requestedTotal) > Number(availableTotal) + 0.0001) {
      await transaction.rollback();
      return errorResponse(res, 5012);
    }

    const createdDiamondLotIdsForResponse = [];
    const createdQrIds = [];

    const findOrCreateDiamondLot = async (
      purchase_location,
      grade_id,
      sieve_size,
      is_on_book
    ) => {
      let existing = await db.DiamondsLots.findOne({
        where: {
          purchase_location,
          grade_id,
          sieve_size,
          is_on_book,
          is_deleted: false,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (existing) return existing;

      const created = await db.DiamondsLots.create(
        {
          grade_id,
          purchase_location,
          sieve_size,
          is_on_book,
          total_weight: 0,
          zero_point_twenty_five_carat_packet_count: 0,
          zero_point_twenty_five_carat_packet_weight: 0,
          zero_point_fifty_carat_packet_count: 0,
          zero_point_fifty_carat_packet_weight: 0,
          one_carat_packet_count: 0,
          one_carat_packet_weight: 0,
          unpacked_quantity: 0,
          total_quantity: 0,
        },
        { transaction }
      );
      return created;
    };

    let purchase_location = null;
    for (const s of sourceQrs) {
      const lot = await db.DiamondsLots.findOne({
        where: { id: s.diamond_lot_id, is_deleted: false },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!lot) {
        await transaction.rollback();
        return errorResponse(res, 5003);
      }
      if (purchase_location == null) purchase_location = lot.purchase_location;
      if (purchase_location !== lot.purchase_location) {
        await transaction.rollback();
        return errorResponse(res, 5022);
      }
    }

    for (const pkt of packets) {
      let remaining = Number(pkt.weight);
      const contributions = []; // { source_qr_id, from_on_book, from_off_book, source_diamond_lot_id }

      const totalOnAvailable = sumQueueRem(onBookQueue);
      const totalOffAvailable = sumQueueRem(offBookQueue);

      if (totalOnAvailable >= remaining) {
        const left = consumeFromQueueFIFO(
          onBookQueue,
          remaining,
          contributions,
          'on'
        );
        if (left > 0) {
          await transaction.rollback();
          return errorResponse(res, 5019); // insufficient (shouldn't happen)
        }
        pkt.is_on_book = 'true';
      } else if (totalOffAvailable >= remaining) {
        const left = consumeFromQueueFIFO(
          offBookQueue,
          remaining,
          contributions,
          'off'
        );
        if (left > 0) {
          await transaction.rollback();
          return errorResponse(res, 5019);
        }
        pkt.is_on_book = 'false';
      } else {
        // mix: take from on then off
        let left = remaining;
        left = consumeFromQueueFIFO(onBookQueue, left, contributions, 'on');
        if (left > 0) {
          const left2 = consumeFromQueueFIFO(
            offBookQueue,
            left,
            contributions,
            'off'
          );
          if (left2 > 0) {
            await transaction.rollback();
            return errorResponse(res, 5019);
          }
        }
        pkt.is_on_book = 'mix';
      }

      // sum contributions to verify
      const sumOn = contributions.reduce(
        (s, c) => s + Number(c.from_on_book || 0),
        0
      );
      const sumOff = contributions.reduce(
        (s, c) => s + Number(c.from_off_book || 0),
        0
      );
      const sumTotal = Number(sumOn) + Number(sumOff);
      if (Math.abs(sumTotal - Number(pkt.weight)) > 0.0001) {
        await transaction.rollback();
        return errorResponse(res, 5012);
      }

      // ===== create or update DiamondsLots for the target (use grade + sieve_size + is_on_book)
      const gradeRecord = await db.Grades.findOne({
        where: {
          shape: pkt.shape,
          color: pkt.color,
          clarity: pkt.clarity,
          is_deleted: false,
        },
        transaction,
      });

      let gradeId;
      if (!gradeRecord) {
        const newGrade = await db.Grades.create(
          {
            shape: pkt.shape,
            color: pkt.color,
            clarity: pkt.clarity,
          },
          { transaction }
        );
        gradeId = newGrade.id;
      } else gradeId = gradeRecord.id;

      // find or create target DiamondsLots (for pkt.is_on_book) and the 'total' lot
      console.log('first');
      console.log('purchase_location ==> ', purchase_location);
      console.log('gradeId ==> ', gradeId);
      console.log('pkt.sieve_size ==> ', pkt.sieve_size);
      console.log('pkt.is_on_book ==> ', pkt.is_on_book);
      const targetLot = await findOrCreateDiamondLot(
        purchase_location,
        gradeId,
        pkt.sieve_size,
        pkt.is_on_book
      );
      console.log('2nd');
      const totalLot = await findOrCreateDiamondLot(
        purchase_location,
        gradeId,
        pkt.sieve_size,
        'total'
      );

      // Update target lot's counts/weights depending on packet weight type (0.25/0.5/1 or arbitrary)
      // Determine packet type for counters
      const w = Number(pkt.weight);
      const updatesTarget = {};
      const updatesTotal = {};
      // total_quantity and total_weight update
      updatesTarget.total_weight = db.Sequelize.literal(`total_weight + ${w}`);
      updatesTotal.total_weight = db.Sequelize.literal(`total_weight + ${w}`);
      updatesTarget.total_quantity = db.Sequelize.literal(
        `total_quantity + ${w}`
      );
      updatesTotal.total_quantity = db.Sequelize.literal(
        `total_quantity + ${w}`
      );

      // For packet counts set, increment respective packet_count and packet_weight
      if (Math.abs(w - 0.25) < 0.0001) {
        updatesTarget.zero_point_twenty_five_carat_packet_count =
          db.Sequelize.literal(`zero_point_twenty_five_carat_packet_count + 1`);
        updatesTarget.zero_point_twenty_five_carat_packet_weight =
          db.Sequelize.literal(
            `zero_point_twenty_five_carat_packet_weight + ${w}`
          );
        updatesTotal.zero_point_twenty_five_carat_packet_count =
          db.Sequelize.literal(`zero_point_twenty_five_carat_packet_count + 1`);
        updatesTotal.zero_point_twenty_five_carat_packet_weight =
          db.Sequelize.literal(
            `zero_point_twenty_five_carat_packet_weight + ${w}`
          );
      } else if (Math.abs(w - 0.5) < 0.0001) {
        updatesTarget.zero_point_fifty_carat_packet_count =
          db.Sequelize.literal(`zero_point_fifty_carat_packet_count + 1`);
        updatesTarget.zero_point_fifty_carat_packet_weight =
          db.Sequelize.literal(`zero_point_fifty_carat_packet_weight + ${w}`);
        updatesTotal.zero_point_fifty_carat_packet_count = db.Sequelize.literal(
          `zero_point_fifty_carat_packet_count + 1`
        );
        updatesTotal.zero_point_fifty_carat_packet_weight =
          db.Sequelize.literal(`zero_point_fifty_carat_packet_weight + ${w}`);
      } else if (Math.abs(w - 1.0) < 0.0001) {
        updatesTarget.one_carat_packet_count = db.Sequelize.literal(
          `one_carat_packet_count + 1`
        );
        updatesTarget.one_carat_packet_weight = db.Sequelize.literal(
          `one_carat_packet_weight + ${w}`
        );
        updatesTotal.one_carat_packet_count = db.Sequelize.literal(
          `one_carat_packet_count + 1`
        );
        updatesTotal.one_carat_packet_weight = db.Sequelize.literal(
          `one_carat_packet_weight + ${w}`
        );
      } else {
        // non-standard weight goes to unpacked_quantity
        updatesTarget.unpacked_quantity = db.Sequelize.literal(
          `unpacked_quantity + ${w}`
        );
        updatesTotal.unpacked_quantity = db.Sequelize.literal(
          `unpacked_quantity + ${w}`
        );
      }

      // Also update unpacked_quantity and total_quantity sums as appropr.
      // Apply target update
      await db.DiamondsLots.update(updatesTarget, {
        where: { id: targetLot.id },
        transaction,
      });

      // Apply total update (mirror to 'total' lot)
      await db.DiamondsLots.update(updatesTotal, {
        where: { id: totalLot.id },
        transaction,
      });

      // 6. Create new QR row for the packet
      const createdQr = await db.DiamondsLotsQRCodes.create(
        {
          diamond_lot_id: targetLot.id,
          grade_id: gradeId,
          is_on_book: pkt.is_on_book,
          weight: pkt.weight,
          on_book_weight: Number(sumOn) > 0 ? Number(sumOn) : null,
          off_book_weight: Number(sumOff) > 0 ? Number(sumOff) : null,
          unpacked_qr_code_ids: Array.from(
            new Set(contributions.map((c) => c.source_qr_id))
          ),
        },
        { transaction }
      );

      // update string_code safely
      await db.DiamondsLotsQRCodes.update(
        {
          string_code: `${createdQr.id}-${createdQr.is_on_book === 'true' ? '1' : createdQr.is_on_book === 'false' ? '0' : '2'}`,
        },
        { where: { id: createdQr.id }, transaction }
      );

      // create provenance rows
      for (const c of contributions) {
        await db.DiamondsLotsQRCodesSources.create(
          {
            new_qr_code_id: createdQr.id,
            source_qr_code_id: c.source_qr_id,
            source_diamond_lot_id: c.source_diamond_lot_id || null,
            from_on_book_weight: Number(c.from_on_book || 0),
            from_off_book_weight: Number(c.from_off_book || 0),
          },
          { transaction }
        );
      }

      createdDiamondLotIdsForResponse.push(targetLot.id);
      createdQrIds.push(createdQr.id);

      // mark any source QR fully consumed as unpacked
      // note: contributions modified the queue items; but we still need to check sourceQrs states
      // For simplicity, mark source as unpacked if both its on/off rem contributions are exhausted in our queues
      // To compute that, check if any queue entries remain for that source id
      // find all source ids
      const remainingOnById = {};
      for (const q of onBookQueue)
        remainingOnById[q.source_qr_id] =
          (remainingOnById[q.source_qr_id] || 0) + Number(q.rem || 0);
      const remainingOffById = {};
      for (const q of offBookQueue)
        remainingOffById[q.source_qr_id] =
          (remainingOffById[q.source_qr_id] || 0) + Number(q.rem || 0);

      // for each original source, if both remainingOn and remainingOff are 0 or undefined → mark as unpacked
      for (const s of sourceQrs) {
        const remOn = Number(remainingOnById[s.id] || 0);
        const remOff = Number(remainingOffById[s.id] || 0);
        if (remOn <= 0 && remOff <= 0) {
          // fully consumed -> mark unpacked
          await db.DiamondsLotsQRCodes.update(
            { is_unpacked: true },
            { where: { id: s.id }, transaction }
          );
        }
      }
    } // for each packet

    // commit
    await transaction.commit();

    // fetch result details (only the newly created lots or qrs) - include Grades for response
    const getQRDetails = await db.DiamondsLotsQRCodes.findAll({
      where: { id: { [Op.in]: createdQrIds } },
      include: [
        { model: db.Grades, attributes: ['shape', 'color', 'clarity'] },
        {
          model: db.DiamondsLotsQRCodesSources,
          as: 'sources',
          attributes: [
            'source_qr_code_id',
            'source_diamond_lot_id',
            'from_on_book_weight',
            'from_off_book_weight',
          ],
        },
      ],
    });

    const response = { QRDetails: getQRDetails };
    return successResponse(res, 5016, response);
  } catch (error) {
    console.log('unpackDiamondsLot error', error);
    await transaction.rollback();
    return errorResponse(res, 9999, error);
  }
};

export default {
  addDiamonds,
  getDiamonds,
  getDiamondsQRCodes,
  scanDiamondsQRCodes,
  deleteDiamonds,
  getPurchaseHistory,
  updateStoreDiamondsActiveInactive,
  unpackDiamondsLot,
};
