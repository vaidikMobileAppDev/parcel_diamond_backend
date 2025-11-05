import Validator from 'validatorjs';
import db from '../../config/db.config.js';
import { Op, Sequelize, literal, col, fn } from 'sequelize';
import { errorResponse, successResponse } from '../../helpers/response.js';

const {
  CustomerCartItem,
  Country,
  PricePerCaratRegion,
  DiamondPacket
} = db;

const getAllCartList = async (req, res) => {
  try {
    const user = req.customer;
    const userId = user.id;
    const region = user.country;

    let CountryData = await Country.findOne({
                              attributes : ['id'],
                              where: {
                                name: { [Op.iLike]: region }
                              },
                              include: [
                              {
                                model: db.RegionCountry,
                                as: "regionCountryDetail",
                                attributes: ["id"],
                                include: [
                                  {
                                    model: db.Region,
                                    as: "regionDetail", 
                                    attributes: ["id", "name"]
                                  }
                                ]
                              },
                              {
                                model: db.Location,
                                as: "LocationDetail", 
                                attributes: ["id"]                            
                              }
                            ]
                    });
          
    CountryData = CountryData?.get({ plain: true });
    const regionId = CountryData?.regionCountryDetail?.regionDetail?.id || '';
    const locationId = region ? (CountryData?.LocationDetail?.id ? CountryData.LocationDetail.id : -1) : '';

    const  { rows, count } = await CustomerCartItem.findAndCountAll({
      where: { customer: userId },
      include: [
        {
          model: db.DiamondLot,
          as: 'lotDetail',
          include : [
            {
              model: DiamondPacket,
              where: { 
                isAvailableForStore: true,
                isUnpacked: false,
                remainingWeight: { [Op.gt]: 0 },
                location: locationId
              },
              as: 'packets',  
               attributes: [], // Don’t fetch full packet data
               required: false         
            },
            {
              model: db.DiamondGrade,
              as: 'gradeDetail',
              attributes : { exclude: ['createdAt', 'updatedAt','deletedAt', 'code'] },
              include: [
                {
                  model: db.Shape,
                  as: 'shapeDetail',
                  attributes : ['id', 'shape']
                },
                {
                  model: db.Color,
                  as: 'colorDetail',
                  attributes : ['id', 'color']
                },
                {
                  model: db.Clarity,
                  as: 'clarityDetail',
                  attributes : ['id', 'clarity']
                }
              ]
            },
            {
              model: db.SieveSize,
              as: 'sieveSizeDetail',
              attributes : ['id', 'size']
            }
          ],
          attributes: {
            include: [
              [fn('COUNT', col('lotDetail.packets.id')), 'packetsCount']
            ]
          }
        }
      ],
      group: [
          'customer_cart_items.id',
          'lotDetail.id',
          'lotDetail->gradeDetail.id',
          'lotDetail->gradeDetail->shapeDetail.id',
          'lotDetail->gradeDetail->colorDetail.id',
          'lotDetail->gradeDetail->clarityDetail.id',
          'lotDetail->sieveSizeDetail.id'
        ],
        distinct: true
    });

   const processedData = await Promise.all(
      rows.map(async (p) => {
        const plainP = p.get({ plain: true }); // ✅ convert to plain object

        const pricePerCT = await PricePerCaratRegion.findOne({
          attributes: ['price'],
          where: {
            region: Number(regionId),
            shape: Number(plainP?.lotDetail?.gradeDetail?.shapeDetail?.id),
            color: Number(plainP?.lotDetail?.gradeDetail?.colorDetail?.id),
            clarity: Number(plainP?.lotDetail?.gradeDetail?.clarityDetail?.id),
            sieveSize: Number(plainP?.lotDetail?.sieveSizeDetail?.id),
          },
        });

        plainP.lotDetail.pricePerCT = pricePerCT ? pricePerCT.price : null;
        return plainP;
      })
    );

    const totalCartItems = Array.isArray(count) ? count.length : count;
    
    return successResponse(res, 5037, { totalCartItems, data : processedData});
  } catch (err) {
    console.log('err :>> ', err);
    return errorResponse(res, err.message || err);
  }
};

export default {
  getAllCartList
};
