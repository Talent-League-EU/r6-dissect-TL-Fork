const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const unzipper = require('unzipper');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const port = 5001;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Ensure static files are served

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('zipfile'), async (req, res) => {
  const teamName = req.body.team;
  const zipPath = req.file.path;
  const originalName = req.file.originalname.replace('.zip', '');

  const unzipPath = `uploads/${originalName}`;

  fs.createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: unzipPath }))
    .on('close', async () => {
      const files = fs.readdirSync(unzipPath);
      const invalidFiles = files.filter(file => !file.endsWith('.rec'));

      if (invalidFiles.length > 0) {
        res.status(400).send('Invalid match replay folder');
      } else {
        const newFolderName = `${originalName}-${teamName}`;
        const newFolderPath = `uploads/${newFolderName}`;

        fs.renameSync(unzipPath, newFolderPath);

        const s3Path = `s3://tlmrisserver/pre-exported-data/${newFolderName}`;
        exec(`aws s3 cp ${newFolderPath} ${s3Path} --recursive`, (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            res.status(500).send('Error uploading to S3');
            return;
          }

          res.send('Upload successful');
        });
      }
    });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
