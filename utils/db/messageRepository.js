const { safeClone } = require('./helpers');

function createMessageRepository(pool, dataRepository, logger) {
  async function saveMessageRow(event, timestamp = new Date().toISOString()) {
    try {
      const data = event.data || {};
      const contentObj = data.content && typeof data.content === 'object' ? data.content : {};
      let fileSize = null, fileExt = null, checksum = null, duration = null, fType = null;

      if (contentObj.params) {
        try {
          const params = JSON.parse(contentObj.params);
          if (params.fileSize) fileSize = Number(params.fileSize);
          if (params.fileExt) fileExt = params.fileExt;
          if (params.checksum) checksum = params.checksum;
          if (params.duration) duration = Number(params.duration);
          if (typeof params.fType !== 'undefined') fType = Number(params.fType);
        } catch (error) {}
      }

      const paramsExt = data.paramsExt || {};
      const columns = ['threadId', 'userId', 'content', 'msgId', 'cliMsgId', 'msgType', 'senderName', 'ts', 'status', 'countUnread', 'platformType', 'propertyExt', 'media_href', 'media_thumb', 'media_title', 'media_params', 'file_size', 'file_ext', 'checksum', 'duration', 'fType', 'previewThumb', 'pathMinio', 'raw'];
      const values = [
        event.threadId || data.threadId || null,
        data.uidFrom || data.senderId || data.uin || null,
        contentObj.title ?? (typeof data.content === 'string' ? data.content : null),
        data.msgId || data.realMsgId || null, data.cliMsgId || null, data.msgType || null,
        data.dName || null, data.ts || timestamp,
        typeof data.status !== 'undefined' ? Number(data.status) : null,
        typeof paramsExt.countUnread !== 'undefined' ? Number(paramsExt.countUnread) : null,
        typeof paramsExt.platformType !== 'undefined' ? Number(paramsExt.platformType) : null,
        data.propertyExt ? JSON.stringify(data.propertyExt) : null,
        contentObj.href || null, contentObj.thumb || null, contentObj.title || null,
        contentObj.params || null, fileSize, fileExt, checksum, duration, fType,
        data.previewThumb || null, event.pathMinio || null, JSON.stringify(safeClone(event))
      ];

      await pool.execute(`INSERT INTO Messages (${columns.join(',')}) VALUES (${values.map(() => '?').join(',')})`, values);
    } catch (error) {
      logger.log('Lỗi khi lưu Messages table: ' + error.message, 'error');
    }
  }

  async function updateMessageMinioPath(event, pathMinio) {
    try {
      const data = event.data || {};
      const msgId = data.msgId || data.realMsgId || null;
      const cliMsgId = data.cliMsgId || null;
      if ((!msgId && !cliMsgId) || !pathMinio) return false;

      const [result] = await pool.execute(
        'UPDATE Messages SET pathMinio = ? WHERE msgId = ? OR cliMsgId = ?',
        [pathMinio, msgId, cliMsgId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      logger.log('Lỗi khi cập nhật pathMinio: ' + error.message, 'error');
      return false;
    }
  }

  async function saveMessageLog(event, timestamp = new Date().toISOString()) {
    try {
      const threadId = event.threadId || (event.data && event.data.threadId) || 'unknown';
      const row = await dataRepository.getData('Threads', 'threadId', threadId);
      const existing = row && row.data ? row.data : {};
      existing.messages = Array.isArray(existing.messages) ? existing.messages : [];
      existing.messages.push({ timestamp, event: safeClone(event) });
      await dataRepository.saveData('Threads', 'threadId', threadId, existing);
    } catch (error) {
      logger.log('Lỗi khi lưu message log: ' + error.message, 'error');
    }
  }

  return { saveMessageRow, saveMessageLog, updateMessageMinioPath };
}

module.exports = createMessageRepository;