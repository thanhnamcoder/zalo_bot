const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
const { minioClient, BUCKET } = require('../core/loginMinio');

function getObjectUrl(objectName) {
    const { endpoint, port, use_ssl: useSSL } = global.config.minio;
    const protocol = useSSL ? 'https' : 'http';
    const encodedObjectName = objectName.split('/').map(encodeURIComponent).join('/');

    return `${protocol}://${endpoint}:${port}/${BUCKET}/${encodedObjectName}`;
}

function getObjectPath(objectName) {
    const encodedObjectName = objectName.split('/').map(encodeURIComponent).join('/');
    return `/${BUCKET}/${encodedObjectName}`;
}

function getExtension(url, fileExt) {
    if (fileExt) return `.${String(fileExt).replace(/^\./, '').toLowerCase()}`;

    try {
        const extension = path.extname(new URL(url).pathname).toLowerCase();
        return extension.length <= 10 ? extension : '';
    } catch (error) {
        return '';
    }
}

async function uploadUrlToMinio(url, options = {}) {
    const response = await axios.get(url, { responseType: 'stream' });
    const contentLength = response.headers['content-length'];
    const size = contentLength ? Number(contentLength) : undefined;
    const objectName = options.objectName || `${Date.now()}-${crypto.randomUUID()}${getExtension(url, options.fileExt)}`;
    const metadata = {};

    if (response.headers['content-type']) {
        metadata['Content-Type'] = response.headers['content-type'];
    }

    await minioClient.putObject(BUCKET, objectName, response.data, size, metadata);

    return {
        bucket: BUCKET,
        objectName,
        objectPath: getObjectPath(objectName),
        objectUrl: getObjectUrl(objectName),
        size,
        contentType: response.headers['content-type'] || null
    };
}

module.exports = {
    minioClient,
    BUCKET,
    uploadUrlToMinio
};
