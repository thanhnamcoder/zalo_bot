const { saveMessageRow } = require("../../utils/db");

module.exports.config = {
    event_type: ["message"],
    name: "messageJson",
    version: "1.0.0",
    author: "Copilot",
    description: "Bắt toàn bộ JSON của tin nhắn và ghi ra console/file",
    dependencies: {}
};

module.exports.run = async function({ api, event }) {
    const timestamp = new Date().toISOString();

    try {
        const payload = JSON.stringify({ timestamp, event }, null, 2);
        console.log("===== MESSAGE JSON =====");
        console.log(payload);
        await saveMessageRow(event, timestamp);
    } catch (err) {
        console.error("Lỗi khi lưu JSON tin nhắn vào DB:", err.message);
    }
};