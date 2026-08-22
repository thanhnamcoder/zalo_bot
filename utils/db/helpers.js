function safeClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    return { _error: 'non-serializable', message: String(error) };
  }
}

function validateIdentifier(name) {
  return typeof name === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

module.exports = {
  safeClone,
  validateIdentifier
};