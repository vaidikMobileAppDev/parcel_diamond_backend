import { UCFirstWords } from "../helpers/other_helper.js";

export default (sequelize, Sequelize) => {
  const Order_status_caption = sequelize.define('order_status_captions', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    parentId: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      set(value) {     
        this.setDataValue('name', UCFirstWords(value));
      }      
    },
    customer_caption: {
      type: Sequelize.STRING,
      allowNull: true
    },
    admin_caption: {
      type: Sequelize.STRING,
      allowNull: true
    },
    description: {
      type: Sequelize.STRING,
      allowNull: true
    }, 
    is_deleted: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },   
    createdAt: {
      field: 'created_at',
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      field: 'updated_at',
      type: Sequelize.DATE,
      allowNull: false,
    },
  });
  return Order_status_caption;
};
