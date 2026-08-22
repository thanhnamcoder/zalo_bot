const Minio = require('minio');

const minioConfig = global.config.minio;

const minioClient = new Minio.Client({
    endPoint: minioConfig.endpoint,
    port: minioConfig.port,
    useSSL: minioConfig.use_ssl,
    accessKey: minioConfig.access_key,
    secretKey: minioConfig.secret_key,
});

const BUCKET = minioConfig.bucket;

module.exports = {
    minioClient,
    BUCKET,
};