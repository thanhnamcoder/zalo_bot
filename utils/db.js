const logger = require('./logger');
const pool = require('./db/connection');
const ensureTables = require('./db/schema');
const createDataRepository = require('./db/dataRepository');
const createMessageRepository = require('./db/messageRepository');

const dataRepository = createDataRepository(pool);
const messageRepository = createMessageRepository(pool, dataRepository, logger);

(async () => {
  try {
    await ensureTables(pool, logger);
  } catch (error) {
    logger.log('Lỗi khi khởi tạo bảng MariaDB: ' + error.message, 'error');
  }
})();

module.exports = {
  pool,
  ...dataRepository,
  ...messageRepository
};