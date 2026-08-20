const { getData, saveData, pool } = require('../../utils/db');
const logger = require('../../utils/logger');

module.exports = {
  getAll: async () => {
    const [rows] = await pool.execute('SELECT * FROM Users');
    return rows.map(row => ({
      userId: row.userId,
      data: row.data ? JSON.parse(row.data) : {}
    }));
  },

  getData: async (userId) => {
    const row = await getData('Users', 'userId', userId);
    if (!row) {
      await module.exports.createData(userId, { ban: false, money: global.config && global.config.default_money ? global.config.default_money : 0 });
      logger.log("Đã tạo database cho người dùng: " + userId, "info");
      return await getData('Users', 'userId', userId);
    }
    return row;
  },

  setData: async (userId, data) => {
    await saveData('Users', 'userId', userId, data);
  },

  delData: async (userId) => {
    await pool.execute('DELETE FROM Users WHERE userId = ?', [userId]);
  },

  createData: async (userId, defaultData = {}) => {
    const [rows] = await pool.execute('SELECT 1 FROM Users WHERE userId = ? LIMIT 1', [userId]);
    if (!rows || rows.length === 0) {
      await saveData('Users', 'userId', userId, defaultData);
    }
  }
};
