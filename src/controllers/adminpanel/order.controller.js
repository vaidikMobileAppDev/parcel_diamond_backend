import Validator from 'validatorjs';
import db from '../../config/db.config.js';
import { Op, Sequelize, literal, col, fn } from 'sequelize';
import { errorResponse, successResponse } from '../../helpers/response.js';

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
  InventoryMovement
} = db;

const getAllOrders = async (req, res) => {
  try {   
    const orders = await Order.findAll({
      include: [
        {
          model: Customer,
          as: 'customerDetail',
          attributes :  ['id', 'email','name', 'lastName','phone_no','company_name','country','state','city','pincode']
        },
        {
          model: db.Order_status_caption,
          as: 'orderStatusDetail',
          attributes : ['id', 'name', 'admin_caption']
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
    const { id } = req.query;

    const order = await Order.findOne({ 
                    where: { id: id },
                    include: [
                      {
                        model: Customer,
                        as: 'customerDetail',
                        attributes :  ['id', 'email','name', 'lastName','phone_no','company_name','country','state','city','pincode']
                      },
                      {
                        model: db.Order_status_caption,
                        as: 'orderStatusDetail',
                        attributes : ['id', 'name','admin_caption']
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

const manageOrderStatus = async (req, res) => {
   const t = await db.sequelize.transaction();
   try {
    const { order_id, status_id, courier_service, trackingcode, trackingurl, remark, reject_reason } = req.body;

    const validation = new Validator(req.body, {
          order_id: 'required',
          status_id: 'required',
    });

    if (validation.fails()) {
      const firstMessage = validation.errors.first(
        Object.keys(validation.errors.all())[0]
      );
      return errorResponse(res, firstMessage);
    }

    const AllOrderStatus = await Order_status_caption.findAll();
    const status = AllOrderStatus.find((status) => status.id == status_id);
    if (!status) {
      return errorResponse(res, 6012);
    }

    const AcceptStatus = AllOrderStatus.find((status) => status.name == "Approved");
    const RejectedStatus = AllOrderStatus.find((status) => status.name == "Reject");
    const CancelStatus = AllOrderStatus.find((status) => status.name == "Cancel");
    const ShippedStatus = AllOrderStatus.find((status) => status.name == "Shipped");
    const DeliveredStatus = AllOrderStatus.find((status) => status.name == "Delivered");

    // const AvailablePacketStatus = await Packet_status.findOne({ where: { name: "Available" } });
    // const NotAvailablePacketStatus = await Packet_status.findOne({ where: { name: "Not Available" } });

    const order = await Order.findOne({ 
                    where: { id: order_id },
                    include: [
                      {
                        model: db.Order_packet_detail,
                        as: 'packetDetail',                        
                      }
                    ] 
                  });
    if(!order){
        return errorResponse(res, 6003);
    }

    const packetIds = order.packetDetail.map((p) => p.packet_id);  // for diamond_packet
    const packetOrderIds = order.packetDetail.map((p) => p.id);   // for order_packet_detail    
    const now = new Date();
    const availableBy = req.admin?.id || null;

    if(RejectedStatus?.id == status_id || CancelStatus?.id == status_id){

        await db.DiamondPacket.update({ 
          // status_id: AvailablePacketStatus?.id, 
          current_status: 'available', 
          isAvailableForStore: true, 
          availableSince: now, 
          availableBy: availableBy 
        }, { where: { id: { [Op.in]: packetIds } } }, { transaction: t });

        await db.Order_packet_detail.update({ current_status : 'unavailable', is_deleted: true }, { where: { id: { [Op.in]: packetOrderIds } } }, { transaction: t });        
    }

    if (!order) {
      return errorResponse(res, 6010);
    }

    order.order_status = status_id;
    order.currier_service = (ShippedStatus?.id == status_id) ? (courier_service || order.currier_service) : order.currier_service;
    order.tracking_code = (ShippedStatus?.id == status_id) ? (trackingcode || order.tracking_code) : order.tracking_code;
    order.tracking_url = (ShippedStatus?.id == status_id) ? (trackingurl || order.tracking_url) : order.tracking_url;
    order.remark = (ShippedStatus?.id == status_id) ? remark || order.remark : order.remark;
    order.cancel_reason = (RejectedStatus?.id == status_id || CancelStatus?.id == status_id) ? (reject_reason || order.cancel_reason) : order.cancel_reason;

    await order.save( { transaction: t } );

    await t.commit();
    return successResponse(res, 6011);
  } catch (err) {
     await t.rollback();
    console.log('err :>> ', err);
    return errorResponse(res, err.message || err);
  }
}

export default {
  getAllOrders,
  getOrderDetails,
  manageOrderStatus
};
