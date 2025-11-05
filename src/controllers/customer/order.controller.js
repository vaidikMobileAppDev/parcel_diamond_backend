import Validator from 'validatorjs';
import db from '../../config/db.config.js';
import { Op, Sequelize, literal, col, fn } from 'sequelize';
import { errorResponse, successResponse } from '../../helpers/response.js';
import config from '../../config/config.js'
const {
  DiamondGrade,
  DiamondLot,
  DiamondPacket,
  Order,
  Order_address,
  Order_packet_detail,
  Order_payment,
  Order_status_caption,  
  Packet_status,
  Customer,
  Customer_address,
  Country,
  PricePerCaratRegion
} = db;

const placeOrder = async (req, res) => {
  const t = await db.sequelize.transaction();
  const ipAddress = req.headers["x-forwarded-for"]?.split(",").shift() || req.socket?.remoteAddress;
  const ipAddData = await fetch(`http://ip-api.com/json/${ipAddress}`).then((res) => res.json());  
  const region = ipAddData?.country || '';

  let CountryData = await Country.findOne({
                            attributes : ['id'],
                            where: {
                              name: { [Op.iLike]: region }
                            },
                            include: [
                            {
                              model: db.RegionCountry,
                              as: "regionCountryDetail", // must match your alias
                              attributes: ["id"],
                              include: [
                                {
                                  model: db.Region,
                                  as: "regionDetail", // must match your alias
                                  attributes: ["id", "name"]
                                }
                              ]
                            },
                            {
                              model: db.Location,
                              as: "LocationDetail", // must match your alias
                              attributes: ["id"]                            
                            }
                          ]
                  });
        
  CountryData = CountryData?.get({ plain: true });
  const regionId = CountryData?.regionCountryDetail?.regionDetail?.id || '';
  const locationId = region ? (CountryData?.LocationDetail?.id ? CountryData.LocationDetail.id : -1) : '';
  
  try {
    const user = req.customer;
    const userId = user.id;

    const validation = new Validator(req.body, {
          packets: 'required',
          billing_firstname: 'required',
          billing_lastname: 'required',
          billing_email: 'required',
          billing_mobile: 'required',
          billing_companyname: 'required',
          billing_address_1: 'required',
          billing_address_2: 'required',
          billing_country: 'required',
          billing_state: 'required',
          billing_city: 'required',
          billing_pincode: 'required',         
          is_shipping_same: 'required|boolean',
          is_save_shipping: 'required|boolean',
          shipp_firstname: 'required_if:is_shipping_same,false',
          shipp_lastname: 'required_if:is_shipping_same,false',
          shipp_email: 'required_if:is_shipping_same,false',
          shipp_mobile: 'required_if:is_shipping_same,false',
          shipp_companyname: 'required_if:is_shipping_same,false',
          shipp_address_1: 'required_if:is_shipping_same,false',
          shipp_address_2: 'required_if:is_shipping_same,false',
          shipp_country: 'required_if:is_shipping_same,false',
          shipp_state: 'required_if:is_shipping_same,false',
          shipp_city: 'required_if:is_shipping_same,false',
          shipp_pincode: 'required_if:is_shipping_same,false',
          delivery_partner: 'required',
          payment_type: 'required',
          card_digit: 'required',
          card_holder_name: 'required',
          sub_total: 'required',
          freight_insurance: 'required',
          total_amount: 'required',
          discount: 'required',
          state_tax: 'required',
          local_tax: 'required',
          final_amount: 'required',
        });
        
        if (validation.fails()) {
          const firstMessage = validation.errors.first(
            Object.keys(validation.errors.all())[0]
          );
          // await transaction.rollback();
          return errorResponse(res, firstMessage);
        }

        //Get Pendiing Order Status Id
        const PendingOrderStatus = await Order_status_caption.findOne({
                            where: { name: {
                              [Op.iLike]: 'pending',
                            } },
                          });

        const PendingOrderStatusId = PendingOrderStatus?.id || null;

        //Get Sold Packet Status Id
        // const SoldPacketStatus = await Packet_status.findOne({
        //                     where: { name: {
        //                       [Op.iLike]: 'sold',
        //                     } },
        //                   });

        // const SoldPacketStatusId = SoldPacketStatus?.id || null;

        const { 
          packets,
          billing_firstname,
          billing_lastname,
          billing_email,
          billing_mobile,
          billing_companyname,
          billing_address_1,
          billing_address_2,
          billing_country,
          billing_state,
          billing_city,
          billing_pincode,
          is_create_account,
          password,
          is_shipping_same,
          is_save_shipping,
          shipp_firstname,
          shipp_lastname,
          shipp_email,
          shipp_mobile,
          shipp_companyname,
          shipp_address_1,
          shipp_address_2,
          shipp_country,
          shipp_state,
          shipp_city,
          shipp_pincode,
          delivery_partner,
          payment_type,
          card_digit,
          card_holder_name,
          sub_total,
          freight_insurance,
          total_amount,
          discount,
          state_tax,
          local_tax,
          final_amount,
        } = req.body;

        //Create Order Start
        const order = await Order.create({
                          user_id : userId,
                          payment_type : payment_type,
                          gross_amount : sub_total,
                          discount_amount : discount,
                          total_amount : total_amount,
                          shipping_charge : freight_insurance,
                          state_tax : state_tax,
                          local_tax : local_tax,
                          net_amount : final_amount,
                          order_status : PendingOrderStatusId
                        }, { transaction: t });
        //Create Order End

        //Create Order Address Start
        const billingObj = {
          type : is_shipping_same == 'true' ? 'both' : 'billing',
          order_id : order?.id,
          user_id : userId,
          first_name : billing_firstname,
          last_name : billing_lastname,
          email : billing_email,
          mobileno : billing_mobile,
          company_name : billing_companyname,
          address_1 : billing_address_1,
          address_2 : billing_address_2,
          country : billing_country,
          state : billing_state,
          city : billing_city,
          pincode : billing_pincode,
        }

        await Order_address.create(billingObj, { transaction: t });
        if (is_shipping_same == 'false') {
          const shippingObj = {
            type : 'shipping',
            order_id : order?.id,
            user_id : userId,
            first_name : shipp_firstname,
            last_name : shipp_lastname,
            email : shipp_email,
            mobileno : shipp_mobile,
            company_name : shipp_companyname,
            address_1 : shipp_address_1,
            address_2 : shipp_address_2,
            country : shipp_country,
            state : shipp_state,
            city : shipp_city,
            pincode : shipp_pincode,
          }
          await Order_address.create(shippingObj, { transaction: t });
          if(is_save_shipping == 'true') {
              delete shippingObj.type;
              delete shippingObj.order_id;    
              const isShippingExist = await Customer_address.findOne({ where : shippingObj });              
              if(!isShippingExist) await Customer_address.create(shippingObj, { transaction: t });  
          }
        }
        //Create Order Address End

        const priorityOrderLiteral = db.sequelize.literal(
              `CASE WHEN "isOnBookFlag"='on_book' THEN 1 WHEN "isOnBookFlag"='off_book' THEN 2 ELSE 3 END`
        );

        const SIZE_META = {
          0.25: { lotField: 'zeroPointTwentyFivePacketCount', weight: 0.25 },
          '0.50': { lotField: 'zeroPointFiftyPacketCount', weight: 0.5 },
          '1.00': { lotField: 'oneCaratPacketCount', weight: 1.0 },
        };
        
        const packetObj = JSON.parse(packets);
        // console.log('packetObj :>> ', packetObj);
        // console.log('packetObj.length :>> ', packetObj.length);

        const canonicalSizeKey = (raw) => {
          if (raw === null || raw === undefined) return null;
          const n = Number(raw);
          if (!Number.isFinite(n)) return null;
          return n.toFixed(2);
        };

        const needMap = new Map();
        const lotIdsSet = new Set();

        for (const packetVal of packetObj) {
          const lotId = Number(packetVal.lotId);
          if (!lotId) {
            await t.rollback();
            return errorResponse(res, 'Items Not Found.');
          }
          lotIdsSet.add(lotId);

          const sizeCounts = packetVal.sizeCounts || {};
          for (const rawKey of Object.keys(sizeCounts)) {
            const cKey = canonicalSizeKey(rawKey);
            if (!cKey) {
              await t.rollback();
              return errorResponse(res, `invalid size key: ${rawKey}`);
            }
            const needed = Number(sizeCounts[rawKey]) || 0;
            if (needed <= 0) continue;
            const mapKey = `${lotId}::${cKey}`;
            const existing = needMap.get(mapKey) || {
              lotId,
              sizeKey: cKey,
              needed: 0,
            };
            existing.needed += needed;
            needMap.set(mapKey, existing);
          }
          
        }

        if (needMap.size === 0){
          await t.rollback();
          return errorResponse(res, 'no valid size counts provided');
        }

         const selectedPacket = [];
         const selectedPacketIds = [];

         for (const { lotId, sizeKey, needed } of needMap.values()) {
            const meta = SIZE_META[sizeKey];
            if (!meta) {
              await t.rollback();
              return errorResponse(res, `Unsupported size key '${sizeKey}'`);
            }
            const targetWeight = meta.weight;
            const packetData = await DiamondPacket.findAll({
                                where: {
                                  lot: lotId,
                                  weight: targetWeight,
                                  isUnpacked: false,
                                  isAvailableForStore: true,
                                  remainingWeight: { [Op.gt]: 0 },
                                  current_status : { 
                                    [Op.or]: [
                                      { [Op.notIn]: ['sold'] },
                                      { [Op.is]: null },
                                    ],
                                  },
                                },
                                limit: needed,
                                order: [priorityOrderLiteral, ['createdAt', 'ASC']],
                                transaction: t,
                              });
                              
                              // console.log('packetData :>> ', packetData);
              if (!packetData || packetData.length < needed) {
                await t.rollback();
                return errorResponse(
                  res,
                  'Not enough packets available',
                  `Not enough packets available to satisfy lot ${lotId} size ${sizeKey} (requested ${needed}, found ${packetData ? packetData.length : 0})`
                );
              }
              selectedPacketIds.push(...packetData.map((p) => p.id));
              selectedPacket.push({ lotId, sizeKey, needed, packetData });
         }

         // Add Packet detail in Order Packet Detail Table Start
         for (const packetId of selectedPacketIds) {
            const Packet = await DiamondPacket.findByPk(packetId,
              { include : [
                { model : DiamondLot, as : 'lotDetail' , attributes : ['id', 'sieveSize'] },
                { model : DiamondGrade, as : 'gradeDetail', attributes : ['id', 'shape', 'color', 'clarity'] },
              ]}
              , { transaction: t }
            );
            const pricePerCT = await PricePerCaratRegion.findOne({
                                  attributes : ['price'],
                                  where: { region: Number(regionId), shape: Number(Packet.gradeDetail.shape), color: Number(Packet.gradeDetail.color), clarity: Number(Packet.gradeDetail.clarity), sieveSize: Number(Packet.lotDetail.sieveSize) },
                                });

            const packetObj = {
              order_id : order?.id,
              packet_id : Packet?.id,
              lot_id : Packet?.lot,
              purchase : Packet?.purchase,
              grade : Packet?.grade,
              qrCode : Packet?.qrCode,
              weight : Packet?.weight,
              onBookWeight : Packet?.onBookWeight,
              offBookWeight : Packet?.offBookWeight,
              isOnBookFlag : Packet?.isOnBookFlag,
              isUnpacked : Packet?.isUnpacked,
              remainingWeight : Packet?.remainingWeight,
              isAvailableForStore : Packet?.isAvailableForStore,
              availableSince : Packet?.availableSince,
              availableBy : Packet?.availableBy,
              current_status : Packet?.current_status,
              status_id : Packet?.status_id,
              meta : Packet?.meta,
              price : pricePerCT?.price || 0
            }

            await Order_packet_detail.create(packetObj, { transaction: t });

            Packet.isAvailableForStore = false;
            Packet.availableSince = null;
            Packet.availableBy = null;
            // Packet.status_id = SoldPacketStatusId;
            Packet.current_status = 'sold';
            await Packet.save({ transaction: t });

            // await DiamondPacket.update({ isAvailableForStore: false, availableSince: null, availableBy: null,status_id : SoldStatusId }, { where: { id: packetId }, transaction: t });
         }    
         // Add Packet detail in Order Packet Detail Table End
        
    await t.commit();
    return successResponse(res, 6001, selectedPacket);
  } catch (err) {
    await t.rollback();
    console.log('err :>> ', err);
    return errorResponse(res, err.message || err);
  }
};


const getAllOrders = async (req, res) => {
  try {
    const user = req.customer;
    const userId = user.id;
    const orders = await Order.findAll({
      where: { user_id: userId },
      include: [
        {
          model: db.Order_status_caption,
          as: 'orderStatusDetail',
          attributes : ['id', 'name', 'customer_caption']
        },        
        {
          model: db.Order_packet_detail,
          as: 'packetDetail',
          include: [
            {
              model : db.DiamondLot,
              as: 'lotDetail',
              include : [
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
                        ]
            }
          ]         
        },
      ]
    });
    return successResponse(res, 6008, orders);
  } catch (err) {
    console.log('err :>> ', err);
    return errorResponse(res, err.message || err);
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.customer;
    const userId = user.id;
    
    const order = await Order.findOne({ 
                    where: { id: id, user_id: userId },
                    include: [
                      {
                        model: db.Order_status_caption,
                        as: 'orderStatusDetail',
                        attributes : ['id', 'name', 'customer_caption']
                      }, 
                      {
                        model: db.Order_packet_detail,
                        as: 'packetDetail',
                        include: [
                          {
                            model : db.DiamondLot,
                            as: 'lotDetail',
                            include : [
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
                                      ]
                          }
                        ]         
                      },
                    ]
                  });

    if (!order) {
      return errorResponse(res, 6010);
    }
    return successResponse(res, 6009, order);
  } catch (err) {
    console.log('err :>> ', err);
    return errorResponse(res, err.message || err);
  }
}

const getShippingCharges = async (req, res) => {
  try {
    const fedExRates = await GetFedExShippingCharges(req.body);  

    return successResponse(res, 5040, { fedExRates });
  } catch (err) {
    console.log('err :>> ', err);
    return errorResponse(res, err.message || err);
  }
};

const GetFedExShippingCharges = async (bodyData) => {
  const token = await fetch(config.fedex.tokenUrl, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: new URLSearchParams({
                      grant_type: "client_credentials",
                      client_id: config.fedex.username,
                      client_secret: config.fedex.password,
                    }),
                }).then((res) => res.json());

  if (!token?.access_token){
    return { success : false, message : token?.errors?.[0]?.message, rates : [] };
  }

  const body = {
    accountNumber: { value: config.fedex.accountNumber },
    requestedShipment: {
      shipper: {
        address: {
          postalCode: bodyData?.shipper_postal_code,
          countryCode: bodyData?.shipper_country_code,
        },
      },
      recipient: {
        address: {
          postalCode: bodyData?.recipient_postal_code,
          countryCode: bodyData?.recipient_country_code,
        },
      },
      pickupType: "DROPOFF_AT_FEDEX_LOCATION",
      rateRequestType: ["ACCOUNT", "LIST"],
      packagingType: "YOUR_PACKAGING",
      requestedPackageLineItems: [
        {
          weight: { units: bodyData?.weight_units, value: bodyData?.weight_value },
          dimensions: { length: bodyData?.dimensions_length, width: bodyData?.dimensions_width, height: bodyData?.dimensions_height, units: bodyData?.dimensions_units },
        },
      ],
    },
  };

  const result = await fetch(config.fedex.shippRateUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token?.access_token}`,
                },
                body: JSON.stringify(body),
            });

  const data = await result.json();
  const rates = data.output.rateReplyDetails.map(rate => ({
    service: rate.serviceName,
    code: rate.serviceType,
    price: rate.ratedShipmentDetails[0].totalNetCharge,
    currency: rate.ratedShipmentDetails[0].currency
  }));

  return { success : true, message : 'Get Fedex Shipping Charges Successfully.', rates };
}

const GetDHLShippingCharges = async () => {
   console.log('config.dhl.tokenUrl :>> ', config.dhl.tokenUrl);
   console.log('config.dhl.username :>> ', config.dhl.username);
   console.log('config.dhl.password :>> ', config.dhl.password);
    const token = await fetch(config.dhl.tokenUrl, {
      method: 'POST',
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",        
      },
      body: new URLSearchParams({ 
        grant_type: "client_credentials",
        client_id : config.dhl.username,
        client_secret : config.dhl.password  
      }),
    }).then((res) => res.json());

    if (!token?.access_token){
      return { success : false, message : token?.errors?.[0]?.message, rates : [] };
    }
    
    console.log('token :>> ', token);

}

const OrderCancel = async (req, res) => {
   const t = await db.sequelize.transaction();
  try {
    const { orderId, cancel_reason } = req.body || {};

     const validation = new Validator(req.body, {
          orderId: 'required',
          cancel_reason: 'required'         
        });
        
      if (validation.fails()) {
        const firstMessage = validation.errors.first(
          Object.keys(validation.errors.all())[0]
        );
        // await transaction.rollback();
        return errorResponse(res, firstMessage);
      }

      const CancelOrderStatus = await Order_status_caption.findOne({ where: { name: "Cancel" } });
      const ShippedOrderStatus = await Order_status_caption.findOne({ where: { name: "Shipped" } });
      // const AvailablePacketStatus = await Packet_status.findOne({ where: { name: "Available" } });
      // const NotAvailablePacketStatus = await Packet_status.findOne({ where: { name: "Not Available" } });

      if (!CancelOrderStatus) {
        return errorResponse(res, 6012);
      }

      const order = await Order.findOne({ 
                        where: { id: orderId },
                        include: [
                                    {
                                      model: db.Order_packet_detail,
                                      as: 'packetDetail',                        
                                    }
                                  ]  
                     });
        
      if (!order) {
        await t.rollback();
        return errorResponse(res, 6010);
      }

      const packetIds = order.packetDetail.map((p) => p.packet_id);  // for diamond_packet
      const packetOrderIds = order.packetDetail.map((p) => p.id);   // for order_packet_detail    
      const now = new Date();
      const availableBy = req.admin?.id || null;

      const orderDate = new Date(order?.createdAt);
      const diffMs = now - orderDate               // milliseconds
      const diffHours = diffMs / (1000 * 60 * 60) // hours
      const diffDays = diffHours / 24             // days
      
      if (diffDays > 1) {
        return errorResponse(res, 6013);
      }

      if(order.order_status == ShippedOrderStatus?.id){
        return errorResponse(res, 6014);
      }

      await db.DiamondPacket.update({ 
                current_status : 'available',
                isAvailableForStore: true, 
                availableSince: now, 
                availableBy: availableBy 
              }, { where: { id: { [Op.in]: packetIds } } }, { transaction: t });
      
       await db.Order_packet_detail.update({ current_status : 'unavailable', is_deleted: true }, { where: { id: { [Op.in]: packetOrderIds } } }, { transaction: t }); 

        order.order_status = CancelOrderStatus?.id;        
        order.cancel_reason = cancel_reason;
        await order.save( { transaction: t } );

        await t.commit();
      
      return successResponse(res, 6015, { order, CancelOrderStatus });

  } catch (err) {
    await t.rollback();
    console.log('err :>> ', err);
    return errorResponse(res, err.message || err);
  }
}

export default {
  placeOrder,  
  getAllOrders,
  getShippingCharges,
  getOrderDetails,
  OrderCancel
};
