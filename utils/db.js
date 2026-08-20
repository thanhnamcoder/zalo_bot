const mysql = require('mysql2/promise');
const logger = require('./logger');

const {
  MYSQL_HOST = '192.168.2.52',
  MYSQL_PORT = 3306,
  MYSQL_USER = 'root',
  MYSQL_PASSWORD = '',
  MYSQL_DATABASE = 'zalo_data'
} = process.env;

const pool = mysql.createPool({
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function safeClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return { _error: 'non-serializable', message: String(e) };
  }
}

async function saveMessageRow(event, timestamp = new Date().toISOString()) {
  try {
    const threadId = event.threadId || (event.data && event.data.threadId) || null;
    const data = event.data || {};
    const userId = data.uidFrom || data.senderId || data.uin || null;
    const content = data?.content?.title ?? (typeof data?.content === 'string' ? data.content : null);
    const msgId = data.msgId || data.realMsgId || null;
    const cliMsgId = data.cliMsgId || null;
    const msgType = data.msgType || null;
    const senderName = data.dName || null;
    const ts = data.ts || null;
    const status = typeof data.status !== 'undefined' ? Number(data.status) : null;
    const countUnread = data.paramsExt && typeof data.paramsExt.countUnread !== 'undefined' ? Number(data.paramsExt.countUnread) : null;
    const platformType = data.paramsExt && typeof data.paramsExt.platformType !== 'undefined' ? Number(data.paramsExt.platformType) : null;
    const propertyExt = data.propertyExt ? JSON.stringify(data.propertyExt) : null;
    // media/file fields from content
    const contentObj = data.content || {};
    const media_href = contentObj.href || null;
    const media_thumb = contentObj.thumb || null;
    const media_title = contentObj.title || null;
    const media_params = contentObj.params || null;
    let file_size = null, file_ext = null, checksum = null, duration = null, fType = null;
    if (contentObj.params) {
      try {
        const p = JSON.parse(contentObj.params);
        if (p.fileSize) file_size = Number(p.fileSize);
        if (p.fileExt) file_ext = p.fileExt;
        if (p.checksum) checksum = p.checksum;
        if (p.duration) duration = Number(p.duration);
        if (typeof p.fType !== 'undefined') fType = Number(p.fType);
      } catch (e) {
        // not JSON, ignore
      }
    }
    const previewThumb = data.previewThumb || null;
    const raw = JSON.stringify(safeClone(event));

    // prefer the event's ts field; fall back to provided timestamp
    const tsVal = ts || timestamp;
    const cols = ['threadId','userId','content','msgId','cliMsgId','msgType','senderName','ts','status','countUnread','platformType','propertyExt','media_href','media_thumb','media_title','media_params','file_size','file_ext','checksum','duration','fType','previewThumb','raw'];
    const values = [threadId, userId, content, msgId, cliMsgId, msgType, senderName, tsVal, status, countUnread, platformType, propertyExt, media_href, media_thumb, media_title, media_params, file_size, file_ext, checksum, duration, fType, previewThumb, raw];
    const placeholders = values.map(() => '?').join(',');
    const sql = `INSERT INTO Messages (${cols.join(',')}) VALUES (${placeholders})`;
    await pool.execute(sql, values);
  } catch (err) {
    logger.log('Lỗi khi lưu Messages table: ' + err.message, 'error');
  }
}

function validateIdentifier(name) {
  return typeof name === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

async function ensureTables() {
  // Use TEXT for broad compatibility; JSON column can be used on newer MariaDB
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS Threads (
      threadId VARCHAR(255) PRIMARY KEY,
      data LONGTEXT
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS Users (
      userId VARCHAR(255) PRIMARY KEY,
      data LONGTEXT
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS Currencies (
      userId VARCHAR(255) PRIMARY KEY,
      data LONGTEXT
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS Messages (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      threadId VARCHAR(255),
      userId VARCHAR(255),
      content LONGTEXT,
      msgId VARCHAR(255),
      cliMsgId VARCHAR(255),
      msgType VARCHAR(100),
      senderName VARCHAR(255),
      ts VARCHAR(64),
      status INT,
      countUnread INT,
      platformType INT,
      propertyExt LONGTEXT,
      media_href LONGTEXT,
      media_thumb LONGTEXT,
      media_title VARCHAR(1024),
      media_params LONGTEXT,
      file_size BIGINT,
      file_ext VARCHAR(32),
      checksum VARCHAR(255),
      duration INT,
      fType INT,
      previewThumb LONGTEXT,
      raw LONGTEXT
    )
  `);

  // Ensure extra columns exist for older DBs (no-op if already present)
  const alterStatements = [
    "ALTER TABLE Messages ADD COLUMN IF NOT EXISTS msgId VARCHAR(255)",
    "ALTER TABLE Messages ADD COLUMN IF NOT EXISTS cliMsgId VARCHAR(255)",
    "ALTER TABLE Messages ADD COLUMN IF NOT EXISTS msgType VARCHAR(100)",
    "ALTER TABLE Messages ADD COLUMN IF NOT EXISTS senderName VARCHAR(255)",
    "ALTER TABLE Messages ADD COLUMN IF NOT EXISTS ts VARCHAR(64)",
    "ALTER TABLE Messages ADD COLUMN IF NOT EXISTS status INT",
    "ALTER TABLE Messages ADD COLUMN IF NOT EXISTS countUnread INT",
    "ALTER TABLE Messages ADD COLUMN IF NOT EXISTS platformType INT",
    "ALTER TABLE Messages ADD COLUMN IF NOT EXISTS propertyExt LONGTEXT"
    ,"ALTER TABLE Messages ADD COLUMN IF NOT EXISTS media_href LONGTEXT"
    ,"ALTER TABLE Messages ADD COLUMN IF NOT EXISTS media_thumb LONGTEXT"
    ,"ALTER TABLE Messages ADD COLUMN IF NOT EXISTS media_title VARCHAR(1024)"
    ,"ALTER TABLE Messages ADD COLUMN IF NOT EXISTS media_params LONGTEXT"
    ,"ALTER TABLE Messages ADD COLUMN IF NOT EXISTS file_size BIGINT"
    ,"ALTER TABLE Messages ADD COLUMN IF NOT EXISTS file_ext VARCHAR(32)"
    ,"ALTER TABLE Messages ADD COLUMN IF NOT EXISTS checksum VARCHAR(255)"
    ,"ALTER TABLE Messages ADD COLUMN IF NOT EXISTS duration INT"
    ,"ALTER TABLE Messages ADD COLUMN IF NOT EXISTS fType INT"
    ,"ALTER TABLE Messages ADD COLUMN IF NOT EXISTS previewThumb LONGTEXT"
  ];

  for (const stmt of alterStatements) {
    try {
      await pool.execute(stmt);
    } catch (e) {
      // ignore errors (older MySQL may not support IF NOT EXISTS in ALTER)
      try {
        const alt = stmt.replace(' IF NOT EXISTS', '');
        await pool.execute(alt);
      } catch (err) {
        // ignore duplicate column errors and others
      }
    }
  }

  // Create indexes for faster lookups
  try {
    await pool.execute('CREATE INDEX IF NOT EXISTS idx_messages_thread ON Messages(threadId)');
    await pool.execute('CREATE INDEX IF NOT EXISTS idx_messages_user ON Messages(userId)');
  } catch (e) {
    try {
      await pool.execute('CREATE INDEX idx_messages_thread ON Messages(threadId)');
    } catch {}
    try {
      await pool.execute('CREATE INDEX idx_messages_user ON Messages(userId)');
    } catch {}
  }

  // Try to remove legacy `timestamp` column if present (not all MySQL versions support IF EXISTS)
  try {
    await pool.execute('ALTER TABLE Messages DROP COLUMN timestamp');
  } catch (e) {
    // ignore errors (column may not exist or engine/version doesn't allow)
  }

  logger.log('Đã kết nối và đảm bảo các bảng MariaDB', 'info');
}

(async () => {
  try {
    await ensureTables();
  } catch (err) {
    logger.log('Lỗi khi khởi tạo bảng MariaDB: ' + err.message, 'error');
  }
})();

async function getData(table, idField, id) {
  if (!validateIdentifier(table) || !validateIdentifier(idField)) throw new Error('Invalid table or idField');
  const sql = `SELECT * FROM ${table} WHERE ${idField} = ? LIMIT 1`;
  const [rows] = await pool.execute(sql, [id]);
  const row = rows[0] || null;
  return row ? { ...row, data: row.data ? JSON.parse(row.data) : {} } : null;
}

async function saveData(table, idField, id, dataObj, extra = {}) {
  if (!validateIdentifier(table) || !validateIdentifier(idField)) throw new Error('Invalid table or idField');
  const json = JSON.stringify(dataObj);
  const extraKeys = Object.keys(extra);

  const columns = [idField, ...extraKeys, 'data'];
  const placeholders = columns.map(() => '?').join(', ');
  const values = [id, ...extraKeys.map(k => extra[k]), json];

  const updates = [...extraKeys.map(k => `${k}=VALUES(${k})`), 'data=VALUES(data)'].join(', ');

  const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
  await pool.execute(sql, values);
}

module.exports = {
  getData,
  saveData,
  pool,
  saveMessageLog: async (event, timestamp = new Date().toISOString()) => {
    try {
      const threadId = event.threadId || (event.data && event.data.threadId) || 'unknown';
      const row = await getData('Threads', 'threadId', threadId);
      const existing = row && row.data ? row.data : {};
      existing.messages = Array.isArray(existing.messages) ? existing.messages : [];
      existing.messages.push({ timestamp, event: safeClone(event) });
      await saveData('Threads', 'threadId', threadId, existing);
    } catch (err) {
      logger.log('Lỗi khi lưu message log: ' + err.message, 'error');
    }
  }
  ,
  saveMessageRow
};
