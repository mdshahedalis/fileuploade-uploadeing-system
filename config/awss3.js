// config/awss3.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const secret = require('../secret/secret');


const s3Client = new S3Client({
  region: secret.awsregion,
  credentials: {
    accessKeyId: secret.awsaccesskeyid,
    secretAccessKey: secret.awssecretaccesskey,
  },
});

// Custom multer storage engine for file uploads using AWS SDK v3
const s3Upload = multer({
  storage: multer.memoryStorage(), // Store files in memory before uploading to S3
  limits: { fileSize: 2 * 1024 * 1024 * 1024}, // 2 gb limit
});

// Helper function to upload files to S3
const uploadToS3 = async (fileBuffer, fileName, mimeType) => {
  const bucketName = secret.awsbucketname;

  const params = {
    Bucket: bucketName,
    Key: `${fileName}`, // Generate a unique file name
    Body: fileBuffer,
    ContentType: mimeType,
  };

  try {
    const data = await s3Client.send(new PutObjectCommand(params));
    return `https://${bucketName}.s3.${secret.awsregion}.amazonaws.com/${params.Key}`;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw new Error('Could not upload file to S3');
  }
};

module.exports = { s3Upload, s3Client, uploadToS3 };
