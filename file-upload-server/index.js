const express = require('express');
const fileUpload = require('express-fileupload');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5001;
const S3_BUCKET = 's3://tlmrisserver/pre-exported-data';

// Middleware for file uploads
app.use(fileUpload());

// Endpoint for uploading files
app.post('/upload', async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const zipFile = req.files.file;
  const teamName = req.body.teamName;
  const uploadPath = path.join('/tmp', zipFile.name);

  zipFile.mv(uploadPath, async (err) => {
    if (err) return res.status(500).send(err);

    try {
      const fileKey = `${path.basename(zipFile.name, '.zip')}-${teamName}`;
      const command = `aws s3 cp ${uploadPath} ${S3_BUCKET}/${fileKey}.zip`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return res.status(500).send(`Upload failed: ${error.message}`);
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        res.send('File uploaded!');
      });
    } catch (err) {
      res.status(500).send(`Upload failed: ${err.message}`);
    } finally {
      // Clean up the file after upload
      fs.unlinkSync(uploadPath);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
