import db from '../config/db.config.js';

const {
  AdminPanelPermissions,
  Customer,
  CustomerRoles,
  Supplier,
  Diamonds,
  DiamondsLots,
  DiamondsLotsQRCodes,
  DiamondsGrades
} = db;

const ManagePermissions = [
  {
    backend_path: '/api/v1/admin/customers/get',
    tableName: [Customer],
    exclude: ['password', 'otp', 'forgot_pass_token', 'forgot_pass_otp'],
  },
  {
    backend_path: '/api/v1/admin/configuration--customer_masters/role/get',
    tableName: [CustomerRoles],
    exclude: ['is_deleted'],
  },
  {
    backend_path:
      '/api/v1/admin/accounting-supplier_management--supplier_details/get',
    tableName: [Supplier],
    exclude: ['is_deleted'],
  },
  {
    backend_path: '/api/v1/admin/products--product_list/diamond/get',
    tableName: [Diamonds, DiamondsLots, DiamondsGrades],
    exclude: ['is_deleted'],
  },
  {
    backend_path: '/api/v1/admin/products--purchase_history/history/get',
    tableName: [Diamonds, Supplier, DiamondsGrades],
    exclude: ['is_deleted'],
  },
  {
    backend_path: '/api/v1/admin/products--product_list/diamond/qr-code/get',
    tableName: [DiamondsLotsQRCodes],
    exclude: ['is_deleted'],
  },
];

const syncPermissionFields = async (backend_path, fields) => {
  console.log('backend_path', backend_path);
  console.log('fields', fields);
  const permission = await AdminPanelPermissions.findOne({
    where: { backend_path: backend_path },
  });
  // console.log('permission', permission)
  if (permission) {
    await permission.update({ fields });
  }
  return permission;
};

const updatePermission = async () => {
  for (let i = 0; i < ManagePermissions.length; i++) {
    const { backend_path, tableName } = ManagePermissions[i];

    let fields;
    for (let j = 0; j < tableName.length; j++) {
      let names = await tableName[j].describe();
      fields = { ...fields, ...names };
    }

    let fieldNames = Object.keys(fields);

    fieldNames = fieldNames.filter(
      (field) => !ManagePermissions[i].exclude.includes(field)
    );

    await syncPermissionFields(backend_path, fieldNames);
    console.log(`${backend_path} Permission Fields sysnc successfully`);
  }
};

await updatePermission();

export default { updatePermission };
