// import db from '../src/config/db.config.js';
// const { Customer } = db;

export default [
  {
    id: 1,
    role_id: 1,
    name: 'get dashboard',
    frontend_path: '/dashboard',
    backend_path: '/get-dashboard',
    fields: ['order_id', 'name', 'date'],
  },
];
