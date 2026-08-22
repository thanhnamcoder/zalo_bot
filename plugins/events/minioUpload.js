const { uploadUrlToMinio } = require("../../utils/minio");
const { updateMessageMinioPath } = require("../../utils/db");

module.exports.config = {
    event_type: ["message"],
    name: "minioUpload",
    version: "1.0.0",
    author: "Copilot",
    description: "Upload ảnh và file trong tin nhắn lên MinIO",
    dependencies: {}
};

module.exports.run = async function({ event }) {
    const data = event.data || {};
    const content = data.content && typeof data.content === "object" ? data.content : {};
    const isMedia = data.msgType === "chat.photo" || data.msgType === "share.file";

    if (!isMedia || !content.href) return;

    let fileExt;
    try {
        const params = JSON.parse(content.params || "{}");
        fileExt = params.fileExt;
    } catch (error) {}

    try {
        const result = await uploadUrlToMinio(content.href, { fileExt });
        let pathSaved = await updateMessageMinioPath(event, result.objectPath);
        for (let attempt = 0; !pathSaved && attempt < 3; attempt += 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
            pathSaved = await updateMessageMinioPath(event, result.objectPath);
        }

        if (!pathSaved) {
            console.error("Không tìm thấy message để lưu pathMinio");
        }
        console.log(`Đã upload media lên MinIO, path: ${result.objectPath}`);
    } catch (error) {
        console.error("Lỗi khi upload media lên MinIO:", error.message || error);
    }
};
