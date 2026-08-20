const { getData, saveData, pool } = require('../../utils/db');
const logger = require('../../utils/logger');

module.exports = {
  getAll: async () => {
    const [rows] = await pool.execute('SELECT * FROM Threads');
    return rows.map(row => ({
      threadId: row.threadId,
      data: row.data ? JSON.parse(row.data) : {}
    }));
  },

  getData: async (threadId) => {
    const row = await getData('Threads', 'threadId', threadId);
    if (!row) {
      await module.exports.createData(threadId, { ban: false, admin_only: false, support_only: false, box_only: false, prefix: global.config && global.config.prefix ? global.config.prefix : '!' });
      logger.log("Đã tạo database cho nhóm: " + threadId, "info");
      return await getData('Threads', 'threadId', threadId);
    }
    return row;
  },

  setData: async (threadId, data) => {
    await saveData('Threads', 'threadId', threadId, data);
  },

  delData: async (threadId) => {
    await pool.execute('DELETE FROM Threads WHERE threadId = ?', [threadId]);
  },

  createData: async (threadId, defaultData = {}) => {
    const [rows] = await pool.execute('SELECT 1 FROM Threads WHERE threadId = ? LIMIT 1', [threadId]);
    if (!rows || rows.length === 0) {
      await saveData('Threads', 'threadId', threadId, defaultData);
    }
  }
};
