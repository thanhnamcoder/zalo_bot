const { validateIdentifier } = require('./helpers');

function createDataRepository(pool) {
  async function getData(table, idField, id) {
    if (!validateIdentifier(table) || !validateIdentifier(idField)) {
      throw new Error('Invalid table or idField');
    }

    const sql = `SELECT * FROM ${table} WHERE ${idField} = ? LIMIT 1`;
    const [rows] = await pool.execute(sql, [id]);
    const row = rows[0] || null;
    return row ? { ...row, data: row.data ? JSON.parse(row.data) : {} } : null;
  }

  async function saveData(table, idField, id, dataObj, extra = {}) {
    if (!validateIdentifier(table) || !validateIdentifier(idField)) {
      throw new Error('Invalid table or idField');
    }

    const extraKeys = Object.keys(extra);
    if (extraKeys.some(key => !validateIdentifier(key))) {
      throw new Error('Invalid extra column');
    }

    const columns = [idField, ...extraKeys, 'data'];
    const placeholders = columns.map(() => '?').join(', ');
    const values = [id, ...extraKeys.map(key => extra[key]), JSON.stringify(dataObj)];
    const updates = [...extraKeys.map(key => `${key}=VALUES(${key})`), 'data=VALUES(data)'].join(', ');
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
    await pool.execute(sql, values);
  }

  return { getData, saveData };
}

module.exports = createDataRepository;