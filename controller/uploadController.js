const { DeleteObjectCommand, GetObjectAclCommand, GetObjectCommand} = require('@aws-sdk/client-s3');
const qrcode = require('qrcode');
const File = require('../models/fileModel');
const { uploadToS3, s3Client } = require('../config/awss3'); // Import the new uploadToS3 function
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

// Helper function to calculate expiration time
const getExpirationTime = (expiration) => {
  let expiryTime;
  switch (expiration) {
    case '1h':
      expiryTime = 3600000; // 1 hour
      break;
    case '1d':
      expiryTime = 86400000; // 1 day
      break;
    case '1m':
      expiryTime = 2592000000; // 1 month
      break;
    case '1y':
      expiryTime = 31536000000; // 1 year
      break;
    default:
      expiryTime = 3600000; // default to 1 hour
  }
  return expiryTime;
};

// Upload a single file
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { expiration, description } = req.body;
    const fileBuffer = req.file.buffer; // Use buffer from multer
    const fileName = req.file.originalname;
    const mimeType = req.file.mimetype;

    // Generate a unique public_id
    const public_id = uuidv4();

    // Set expiration date
    const expiresAt = new Date(Date.now() + getExpirationTime(expiration));

    // Upload file to S3
    const fileUrl = await uploadToS3(fileBuffer, fileName, mimeType);

    // Create a new file document in MongoDB
    const newFile = new File({
      url: fileUrl,
      public_id,
      size: req.file.size,
      name: fileName,
      description: description || 'No description provided',
      expiresAt,
    });

    await newFile.save();

    // Generate QR code for the download URL
    const qrCodeUrl = await qrcode.toDataURL(`https://fileuploade-uploadeing-system.netlify.app/download/${public_id}`);

    res.status(200).json({ url: fileUrl, public_id, qrCodeUrl,newFile });
  } catch (error) {
    console.error('Error in uploadFile controller:', error);
    next(error);
  }
};

const uploadFolder = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const { expiration, description } = req.body;
    const filesData = [];

    // Set expiration date
    const expiresAt = new Date(Date.now() + getExpirationTime(expiration));

    // Generate a unique folder name for S3
    const folderName = uuidv4();

    for (const file of req.files) {
      const fileBuffer = file.buffer; // Use buffer from multer
      const fileName = file.originalname;
      const mimeType = file.mimetype;

      // Upload file to S3 inside the new folder
      const s3Key = `${folderName}/${fileName}`; // Specify the folder in the key
      const fileUrl = await uploadToS3(fileBuffer, s3Key, mimeType);

      // Store file data for MongoDB
      filesData.push({
        url: fileUrl,
        public_id: folderName, // Use the folder name as the public_id
        size: file.size,
        name: fileName,
        s3Key, // Store the S3 key
        description: description || 'Uploaded file in folder',
        expiresAt,
      });
    }

    // Save all files in MongoDB
    await File.insertMany(filesData);

    // Generate a QR code for the download URL
    const qrCodeUrl = await qrcode.toDataURL(`https://fileuploade-uploadeing-system.netlify.app/download/${folderName}`);
    
    res.status(200).json({ urls: filesData.map(file => file.url), public_id: folderName, qrCodeUrl });
  } catch (error) {
    console.error('Error in uploadFolder controller:', error);
    next(error);
  }
};


const downloadFileOrFolder = async (req, res, next) => {
  try {
    const { public_id } = req.params;

    // Find all files with the given public_id
    const files = await File.find({ public_id });
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'File or folder not found' });
    }

    if (files.length === 1) {
      // If only one file is found, download it as a single file
      const file = files[0];
      const downloadParams = {
        Bucket: 'shahedrana', // Your S3 bucket name
        Key:file.name // S3 object key (file name)
      };

      // Get the download stream from S3 using GetObjectCommand
      try {
        const command = new GetObjectCommand(downloadParams);
        const response = await s3Client.send(command);
        const s3Stream = response.Body;

        // Set response headers for file download
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);

        // Pipe the S3 stream to the response
        s3Stream.pipe(res).on('error', (streamError) => {
          console.error('Error streaming file:', streamError);
          res.status(500).json({ message: 'Error streaming file' });
        });
      } catch (downloadError) {
        console.error('Error downloading file from S3:', downloadError);
        return res.status(404).json({ message: 'File not found in S3' });
      }
    } else {
      // If multiple files are found, download them as a zip folder
      const archive = archiver('zip', {
        zlib: { level: 9 }, // Compression level
      });

      // Set response headers for downloading a zip file
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${public_id}.zip"`);

      // Pipe the archive data to the response
      archive.pipe(res);

      // Add error handling for the archive stream
      archive.on('error', (err) => {
        console.error('Error creating archive:', err);
        res.status(500).json({ message: 'Error creating zip archive' });
      });

      // Add each file to the archive
      for (const file of files) {
        const downloadParams = {
          Bucket: 'shahedrana',
          Key:`${public_id}/${file.name}`, // first find folder then find file name 
        };
        try {
          const command = new GetObjectCommand(downloadParams);
          const response = await s3Client.send(command);
          const s3FileStream = response.Body;
          archive.append(s3FileStream, { name: file.name });
        } catch (downloadError) {
          console.error('Error downloading file for archive from S3:', downloadError);
        }
      }

      // Finalize the archive (close the zip) after all files are appended
      archive.finalize().catch((finalizeError) => {
        console.error('Error finalizing archive:', finalizeError);
        res.status(500).json({ message: 'Error creating zip archive' });
      });
    }
  } catch (error) {
    console.error('Error in downloadFileOrFolder controller:', error);
    next(error);
  }
};


// Delete expired files
const deleteExpiredFiles = async () => {
  const now = new Date();
  const expiredFiles = await File.find({ expiresAt: { $lt: now } });

  for (const file of expiredFiles) {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: 'shahedrana',
      Key:file.public_id,
    });

    try {
      await s3Client.send(deleteCommand);
      await File.deleteOne({ _id:file._id });
    } catch (error) {
      console.error(`Error deleting file: ${file.name}`, error);
    }
  }
};

// Schedule cron job to delete expired files every hour
cron.schedule('0 * * * *', deleteExpiredFiles);

module.exports = {
  uploadFile,
  uploadFolder,
  downloadFileOrFolder,
};
