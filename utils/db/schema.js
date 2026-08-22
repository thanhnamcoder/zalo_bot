async function ensureTables(pool, logger) {
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
      threadId VARCHAR(255), userId VARCHAR(255), content LONGTEXT,
      msgId VARCHAR(255), cliMsgId VARCHAR(255), msgType VARCHAR(100),
      senderName VARCHAR(255), ts VARCHAR(64), status INT, countUnread INT,
      platformType INT, propertyExt LONGTEXT, media_href LONGTEXT,
      media_thumb LONGTEXT, media_title VARCHAR(1024), media_params LONGTEXT,
      file_size BIGINT, file_ext VARCHAR(32), checksum VARCHAR(255),
      duration INT, fType INT, previewThumb LONGTEXT, pathMinio VARCHAR(1024), raw LONGTEXT
    )
  `);

  const columns = [
    'msgId VARCHAR(255)', 'cliMsgId VARCHAR(255)', 'msgType VARCHAR(100)',
    'senderName VARCHAR(255)', 'ts VARCHAR(64)', 'status INT',
    'countUnread INT', 'platformType INT', 'propertyExt LONGTEXT',
    'media_href LONGTEXT', 'media_thumb LONGTEXT', 'media_title VARCHAR(1024)',
    'media_params LONGTEXT', 'file_size BIGINT', 'file_ext VARCHAR(32)',
    'checksum VARCHAR(255)', 'duration INT', 'fType INT', 'previewThumb LONGTEXT',
    'pathMinio VARCHAR(1024)'
  ];

  for (const column of columns) {
    const statement = `ALTER TABLE Messages ADD COLUMN IF NOT EXISTS ${column}`;
    try {
      await pool.execute(statement);
    } catch (error) {
      try {
        await pool.execute(statement.replace(' IF NOT EXISTS', ''));
      } catch (fallbackError) {}
    }
  }

  try {
    await pool.execute('CREATE INDEX IF NOT EXISTS idx_messages_thread ON Messages(threadId)');
    await pool.execute('CREATE INDEX IF NOT EXISTS idx_messages_user ON Messages(userId)');
  } catch (error) {
    try { await pool.execute('CREATE INDEX idx_messages_thread ON Messages(threadId)'); } catch {}
    try { await pool.execute('CREATE INDEX idx_messages_user ON Messages(userId)'); } catch {}
  }

  try {
    await pool.execute('ALTER TABLE Messages DROP COLUMN timestamp');
  } catch (error) {}

  logger.log('Đã kết nối và đảm bảo các bảng MariaDB', 'info');
}

module.exports = ensureTables;