import db from '../config/db.config.js';

const {
  AdminPanelPermissions,
  Customer,
  CustomerBusinessCard,
  CustomerBusinessCertificate,
  CustomerRoles,
  Supplier,
  DiamondGrade,
  DiamondLot,
  DiamondPacket,
  DiamondPayment,
  DiamondPurchase,
  Region,
  RegionCountry,
  PricePerCaratRegion,
  Order_status_caption,
  Packet_status,
  Order,
  Order_address,
  Order_packet_detail,
  Order_payment
} = db;

const ManagePermissions = [
  {
    backend_path: '/api/v1/admin/customers/get',
    tableName: [Customer, CustomerBusinessCard, CustomerBusinessCertificate],
    exclude: ['password', 'otp', 'forgot_pass_token', 'forgot_pass_otp'],
    include: [],
  },
  {
    backend_path: '/api/v1/admin/configuration--customer_masters/role/get',
    tableName: [CustomerRoles],
    exclude: ['is_deleted'],
    include: [],
  },
  {
    backend_path:
      '/api/v1/admin/accounting-supplier_management--supplier_details/get',
    tableName: [Supplier],
    exclude: ['is_deleted'],
    include: [],
  },
  {
    backend_path: '/api/v1/admin/products--product_list/diamond/get',
    tableName: [DiamondPacket, DiamondLot, DiamondGrade, DiamondPurchase],
    exclude: ['deletedAt'],
    include: [
      'is_show_quantity',
      'is_re_print_qr_code',
      'is_show_on_book_record',
      'show_statistics',
      'packetCount',
    ],
  },
  {
    backend_path: '/api/v1/admin/products--purchase_history/history/get',
    tableName: [DiamondPurchase, Supplier, DiamondGrade, DiamondPayment],
    exclude: ['deletedAt'],
    include: [
      'is_show_on_book_record',
      'is_re_print_qr_code',
      'show_statistics',
      'pendingAmount',
      'overdueDays',
      'isOverdue',
      'isUnpaid',
      'isPaid',
    ],
  },
  {
    backend_path: '/api/v1/admin/products--product_list/diamond/qr-code/get',
    tableName: [DiamondPacket, DiamondGrade],
    exclude: ['deletedAt'],
    include: [],
  },
  {
    backend_path: '/api/v1/admin/products--product_list/diamond/qr-code/scan',
    tableName: [DiamondPacket, DiamondGrade],
    exclude: ['deletedAt'],
    include: [],
  },
  {
    backend_path: '/api/v1/admin/products--product_list/diamond/store-get',
    tableName: [DiamondPacket],
    exclude: ['deletedAt'],
    include: [],
  },
  {
    backend_path: '/api/v1/admin/products--product_list/diamond/store/get',
    tableName: [DiamondPacket],
    exclude: ['deletedAt'],
    include: [],
  },
  {
    backend_path: '/api/v1/admin/dashboard/get',
    tableName: [DiamondLot, DiamondPacket, DiamondPayment, DiamondPurchase],
    exclude: [],
    include: [],
  },
  {
    backend_path: '/api/v1/admin/dashboard/get-excel',
    tableName: [DiamondLot, DiamondPacket, DiamondPayment, DiamondPurchase],
    exclude: [],
    include: [],
  },
  {
    backend_path: '/api/v1/admin/customers/get-customer-carts',
    tableName: [Customer, CustomerBusinessCard, CustomerBusinessCertificate],
    exclude: ['password', 'otp', 'forgot_pass_token', 'forgot_pass_otp'],
    include: ['showCartLength'],
  },
  {
    backend_path: '/api/v1/admin/configuration--order_status_caption/get',
    tableName: [Order_status_caption],
    exclude: [],
    include: [],
  },
  {
    backend_path: '/api/v1/admin/configuration--packet_status/get',
    tableName: [Packet_status],
    exclude: [],
    include: [],
  },
  {
    backend_path: '/api/v1/admin/order/get-all-orders',
    tableName: [Order],
    exclude: [],
    include: ["show_customer_details","show_shipping_address_details","show_billing_address_details"],
  },
  {
    backend_path: '/api/v1/admin/order/details',
    tableName: [Order],
    exclude: [],
    include: [],
  },
];

const syncPermissionFields = async (backend_path, fields) => {
  const permission = await AdminPanelPermissions.findOne({
    where: { backend_path: backend_path },
  });
  if (permission) {
    await permission.update({ fields });
  }
  return permission;
};

const updatePermission = async () => {
  for (let i = 0; i < ManagePermissions.length; i++) {
    const { backend_path, tableName } = ManagePermissions[i];

    let fields = {};
    for (let j = 0; j < tableName.length; j++) {
      const names = await tableName[j].describe();
      fields = { ...fields, ...names };
    }

    let fieldNames = Object.keys(fields);

    fieldNames = fieldNames.filter(
      (field) =>
        !(
          ManagePermissions[i].exclude &&
          ManagePermissions[i].exclude.includes(field)
        )
    );

    if (
      ManagePermissions[i].include &&
      ManagePermissions[i].include.length > 0
    ) {
      ManagePermissions[i].include.forEach((inc) => {
        if (!fieldNames.includes(inc)) fieldNames.push(inc);
      });
    }

    await syncPermissionFields(backend_path, fieldNames);
    console.log(`${backend_path} Permission Fields sync successfully`);
  }
};

await updatePermission();

export default { updatePermission };
