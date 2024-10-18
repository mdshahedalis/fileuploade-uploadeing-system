const express = require('express');
const router = express.Router();
const { s3Upload } = require('../config/awss3');
const { uploadFile, uploadFolder, downloadFileOrFolder, } = require('../controller/uploadController');


router.get('/download/:public_id', downloadFileOrFolder);
router.post('/upload/file', s3Upload.single('file'), uploadFile);
router.post('/upload/folder', s3Upload.array('files'), uploadFolder);


module.exports = router;
