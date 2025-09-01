export default (sequelize, Sequelize) => {
  const DiamondsLots = sequelize.define('diamonds_lots', {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    diamond_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: {
        model: 'diamonds',
        key: 'id',
      },
    },
    diamond_grade_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: {
        model: 'diamonds_grades',
        key: 'id',
      },
    },
    sieve_size: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    total_weight: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: false,
    },
    zero_point_twenty_five_carat_packet_count: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    zero_point_twenty_five_carat_packet_weight: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: true,
    },
    zero_point_fifty_carat_packet_count: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    zero_point_fifty_carat_packet_weight: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: true,
    },
    one_carat_packet_count: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    one_carat_packet_weight: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: true,
    },
    unpacked_quantity: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: true,
    },
    total_quantity: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: true,
    },
    price_per_carat: {
      type: Sequelize.DECIMAL(11, 2),
      allowNull: true,
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
  return DiamondsLots;
};
