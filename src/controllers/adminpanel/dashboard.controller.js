import Decimal from 'decimal.js';
import db from '../../config/db.config.js';
import { errorResponse, successResponse } from '../../helpers/response.js';
import { Op, where, cast, col } from 'sequelize';

const {
  DiamondGrade,
  DiamondLot,
  DiamondPacket,
  DiamondPayment,
  DiamondPurchase,
  InventoryMovement,
  PacketSource,
  PricePerCarat,
  Shape,
  Color,
  Clarity,
  Country,
  Location,
  SieveSize,
  Supplier,
  sequelize,
} = db;

async function safeSum(model, candidates = []) {
  for (const colName of candidates) {
    try {
      const s = await model.sum(colName);
      if (s !== null && typeof s !== 'undefined') return s;
    } catch (e) {
      continue;
    }
  }
  return 0;
}

const getDashboard = async (req, res) => {
  try {
    const PACKET_SIZES = [0.25, 0.5, 1];

    const pdColorRaw = req.query.pdcolor;
    const pdClarityRaw = req.query.pdclarity;
    const pdShapeRaw = req.query.pdshape;

    const pdColor = pdColorRaw ? parseInt(pdColorRaw, 10) : null;
    const pdClarity = pdClarityRaw ? parseInt(pdClarityRaw, 10) : null;
    const pdShape = pdShapeRaw ? parseInt(pdShapeRaw, 10) : null;

    const hasGradeFilter =
      Number.isInteger(pdColor) ||
      Number.isInteger(pdClarity) ||
      Number.isInteger(pdShape);

    const gradeWhere = {};
    if (Number.isInteger(pdColor)) gradeWhere.color = pdColor;
    if (Number.isInteger(pdClarity)) gradeWhere.clarity = pdClarity;
    if (Number.isInteger(pdShape)) gradeWhere.shape = pdShape;

    const makePacketOpts = (additionalWhere = {}) => {
      const opts = { where: additionalWhere };
      if (hasGradeFilter) {
        opts.include = [
          {
            model: DiamondGrade,
            as: 'gradeDetail',
            attributes: [],
            where: gradeWhere,
            required: true,
          },
        ];
      }
      return opts;
    };

    const [
      totalPacketsCount,
      totalWeightResult,
      totalPaidResult,
      totalOnBookWeightResult,
      totalOffBookWeightResult,
    ] = await Promise.all([
      DiamondPacket.count(),
      DiamondPacket.sum('weight'),
      DiamondPayment.sum('amount'),
      DiamondPacket.sum('onBookWeight'),
      DiamondPacket.sum('offBookWeight'),
    ]);

    const [
      totalPkts_0_25,
      totalPkts_0_50,
      totalPkts_1,
      totalUnpackedWeightByPacketsResult,
    ] = await Promise.all([
      DiamondPacket.count(
        makePacketOpts(where(cast(col('weight'), 'numeric'), PACKET_SIZES[0]))
      ),
      DiamondPacket.count(
        makePacketOpts(where(cast(col('weight'), 'numeric'), PACKET_SIZES[1]))
      ),
      DiamondPacket.count(
        makePacketOpts(where(cast(col('weight'), 'numeric'), PACKET_SIZES[2]))
      ),
      DiamondPacket.sum(
        'weight',
        makePacketOpts(
          where(cast(col('weight'), 'numeric'), {
            [Op.notIn]: PACKET_SIZES,
          })
        )
      ),
    ]);

    const totalPurchaseAmountResult = await safeSum(DiamondPurchase, [
      'totalAmount',
      'total_amount',
      'amount',
      'purchasePrice',
      'purchase_price',
    ]);

    const totalPaidFallback = await safeSum(DiamondPayment, [
      'amount',
      'paidAmount',
      'paid_amount',
      'paid',
    ]);
    const totalPaidRaw =
      typeof totalPaidResult !== 'undefined' && totalPaidResult !== null
        ? totalPaidResult
        : totalPaidFallback;

    const toDec = (v) => new Decimal(v || 0);

    const totalPaid = toDec(totalPaidRaw);
    const totalPurchaseAmount = toDec(totalPurchaseAmountResult);
    const totalPending = totalPurchaseAmount.minus(totalPaid);

    const response = {
      totalPackets: Number(totalPacketsCount || 0),

      totalWeight: toDec(totalWeightResult).toFixed(2),

      totalPaidPayment: totalPaid.toFixed(2),
      totalPendingPayment: totalPending.isNegative()
        ? '0.00'
        : totalPending.toFixed(2),

      totalPkts_0_25: Number(totalPkts_0_25 || 0),
      totalPkts_0_50: Number(totalPkts_0_50 || 0),
      totalPkts_1: Number(totalPkts_1 || 0),

      totalUnpackedWeight: toDec(totalUnpackedWeightByPacketsResult).toFixed(2),

      totalOnBookWeight: toDec(totalOnBookWeightResult).toFixed(2),
      totalOffBookWeight: toDec(totalOffBookWeightResult).toFixed(2),
    };

    return successResponse(res, 1006, response);
  } catch (err) {
    console.error('getDashboard err', err);
    return errorResponse(res, 'Failed to fetch dashboard statistics', err);
  }
};

const getExcelData = async (req, res) => {
  try {
    const lots = await DiamondLot.findAll({
      attributes: [
        'id',
        'sieveSize',
        'totalWeight',
        'zeroPointTwentyFivePacketCount',
        'zeroPointFiftyPacketCount',
        'oneCaratPacketCount',
        'unpackedWeight',
        'createdAt',
        'updatedAt',
      ],
      include: [
        {
          model: DiamondGrade,
          as: 'gradeDetail',
          attributes: ['id'],
          include: [
            { model: Shape, as: 'shapeDetail', attributes: ['id', 'shape'] },
            { model: Color, as: 'colorDetail', attributes: ['id', 'color'] },
            {
              model: Clarity,
              as: 'clarityDetail',
              attributes: ['id', 'clarity'],
            },
          ],
          required: false,
        },
        {
          model: DiamondPacket,
          as: 'packets',
          required: false,
          attributes: [
            'id',
            'qrCode',
            'weight',
            'remainingWeight',
            'isAvailableForStore',
            'isUnpacked',
            'isOnBookFlag',
            'location',
          ],
        },
        {
          model: SieveSize,
          as: 'sieveSizeDetail',
          required: false,
          attributes: ['id', 'size'],
        },
      ],
      order: [['id', 'ASC']],
    });

    const toDecimal = (value) => {
      try {
        return new Decimal(value === null || value === undefined ? 0 : value);
      } catch {
        return new Decimal(0);
      }
    };

    const result = lots
      .map((lot) => {
        const packets = Array.isArray(lot.packets) ? lot.packets : [];

        // availablePacketCarat = sum of remainingWeight for packets that are available
        const availablePacketCarat = packets.reduce((acc, pkt) => {
          const rem = toDecimal(pkt.remainingWeight || 0);
          const isAvail =
            pkt.isAvailableForStore === true ||
            pkt.isAvailableForStore === 'true';
          return isAvail && rem.gt(0) ? acc.plus(rem) : acc;
        }, new Decimal(0));

        // availablePacketCount = number of packets that are available (remainingWeight > 0)
        const availablePacketCount = packets.reduce((acc, pkt) => {
          const rem = toDecimal(pkt.remainingWeight || 0);
          const isAvail =
            pkt.isAvailableForStore === true ||
            pkt.isAvailableForStore === 'true';
          return isAvail && rem.gt(0) ? acc + 1 : acc;
        }, 0);

        const zero025Count = Number(lot.zeroPointTwentyFivePacketCount || 0);
        const totalCarat025 = new Decimal(zero025Count).times(
          new Decimal(0.25)
        );

        const zero050Count = Number(lot.zeroPointFiftyPacketCount || 0);
        const totalCarat050 = new Decimal(zero050Count).times(new Decimal(0.5));

        const oneCaratCount = Number(lot.oneCaratPacketCount || 0);
        const totalCarat1 = new Decimal(oneCaratCount).times(new Decimal(1));

        const totalUnpackedCarat = toDecimal(lot.unpackedWeight || 0);

        const isAvailable =
          totalUnpackedCarat.gt(0) ||
          totalCarat025.gt(0) ||
          totalCarat050.gt(0) ||
          availablePacketCarat.gt(0) ||
          totalCarat1.gt(0);

        return {
          id: lot.id,
          purchase: lot.purchase,
          grade: lot.grade,
          gradeDetail: lot.gradeDetail || null,
          sieveSize: lot.sieveSize,
          sieveSizeDetail: lot.sieveSizeDetail || null,
          totalWeight: lot.totalWeight,
          totals: {
            // existing carat totals (strings as before)
            totalCarat025: totalCarat025.toString(),
            totalCarat050: totalCarat050.toString(),
            totalCarat100: totalCarat1.toString(),
            totalUnpackedCarat: totalUnpackedCarat.toString(),
            availablePacketCarat: availablePacketCarat.toString(),

            // NEW: packet counts (integers)
            packetCount025: zero025Count,
            packetCount050: zero050Count,
            packetCount1: oneCaratCount,
            availablePacketCount: availablePacketCount,
          },
          meta: lot.meta,
          createdAt: lot.createdAt,
          updatedAt: lot.updatedAt,
          isAvailable,
        };
      })
      .filter((l) => l.isAvailable);

    return successResponse(res, 1007, { excelData: result });
  } catch (err) {
    console.error('getExcelData error: ', err);
    return errorResponse(res, err.message || 'Failed to fetch excel data.');
  }
};

export default {
  getDashboard,
  getExcelData,
};
