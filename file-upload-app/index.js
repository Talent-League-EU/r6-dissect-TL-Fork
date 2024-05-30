const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const unzipper = require('unzipper');
const path = require('path');
const AWS = require('aws-sdk');
const i18next = require('i18next');
const middleware = require('i18next-http-middleware');
const FsBackend = require('i18next-fs-backend');

const app = express();
const port = 5001;
const bucketName = 'tlmrisserver/pre-exported-data';

AWS.config.update({ region: 'us-east-1' });
const s3 = new AWS.S3();

i18next
  .use(FsBackend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    backend: {
      loadPath: path.join(__dirname, 'locales', '{{lng}}', 'translation.json'),
    },
    detection: {
      order: ['querystring', 'cookie', 'header'],
      caches: ['cookie'],
    },
  });

app.use(middleware.handle(i18next));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.array('zipfiles'), async (req, res) => {
  const teamName = req.body.team;
  const files = req.files;
  const uploadPromises = [];
  let allUploadsSuccessful = true;

  for (let file of files) {
    const zipPath = file.path;
    const originalName = file.originalname.replace('.zip', '');
    const unzipPath = `uploads/${originalName}`;

    const fileExistsInBucket = await checkFileExists(bucketName, `${originalName}-${teamName}/`);
    if (fileExistsInBucket) {
      res.status(400).send('File already exists in the bucket. Please contact an admin on Discord.');
      return;
    }

    const unzipAndUpload = fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: unzipPath }))
      .on('error', (err) => {
        throw new Error(`Error unzipping file: ${err.message}`);
      })
      .on('close', async () => {
        const files = fs.readdirSync(unzipPath);
        const invalidFiles = files.filter(file => !file.endsWith('.rec'));
        if (invalidFiles.length > 0) {
          throw new Error('Incorrect replay structure. The Zip file should only have .rec files in it');
        }

        const newFolderName = `${originalName}-${teamName}`;
        const newFolderPath = `uploads/${newFolderName}`;
        fs.renameSync(unzipPath, newFolderPath);

        const s3Path = `${bucketName}/${newFolderName}`;
        await uploadToS3(newFolderPath, s3Path);
      });

    uploadPromises.push(unzipAndUpload);
  }

  try {
    await Promise.all(uploadPromises);
    res.send('Upload successful');
  } catch (err) {
    res.status(500).send(`Error processing upload: ${err.message}`);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
