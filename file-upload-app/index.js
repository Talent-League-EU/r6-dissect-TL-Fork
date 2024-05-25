const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const unzipper = require('unzipper');
const { exec } = require('child_process');
const path = require('path');
const AWS = require('aws-sdk');

const app = express();
const port = 5001;
const bucketName = 'tlmrisserver/pre-exported-data';

AWS.config.update({ region: 'us-east-1' });
const s3 = new AWS.S3();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });

async function uploadToS3(sourcePath, s3Path, isRecursive = true) {
  return new Promise((resolve, reject) => {
    const command = isRecursive 
      ? `aws s3 cp ${sourcePath} s3://${s3Path} --recursive` 
      : `aws s3 cp ${sourcePath} s3://${s3Path}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      resolve();
    });
  });
}

async function checkFileExists(bucket, key) {
  try {
    await s3.headObject({ Bucket: bucket, Key: key }).promise();
    return true;
  } catch (err) {
    if (err.code === 'NotFound') {
      return false;
    }
    throw err;
  }
}

async function uploadCompleteFile() {
  const completeFilePath = path.join(__dirname, 'upload_complete.txt');
  fs.writeFileSync(completeFilePath, 'Upload Complete');
  await uploadToS3(completeFilePath, `${bucketName}/upload_complete.txt`, false);
}

app.post('/upload', upload.array('zipfiles'), async (req, res) => {
  const teamName = req.body.team;
  const files = req.files;
  const uploadPromises = [];
  let allUploadsSuccessful = true;

  const fileNames = files.map(f => f.originalname);
  const duplicates = fileNames.filter((name, index) => fileNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    return res.status(400).send('Duplicate filenames in upload. Please rename your files.');
  }

  try {
    for (let file of files) {
      const zipPath = file.path;
      const originalName = file.originalname.replace('.zip', '');
      const unzipPath = `uploads/${originalName}`;

      const fileExistsInBucket = await checkFileExists(bucketName, `${originalName}-${teamName}/`);
      if (fileExistsInBucket) {
        return res.status(400).send('File already exists in the bucket. Please contact an admin on Discord.');
      }

      const unzipAndUpload = new Promise((resolve, reject) => {
        fs.createReadStream(zipPath)
          .pipe(unzipper.Extract({ path: unzipPath }))
          .on('error', (err) => reject(`Error unzipping file: ${err.message}`))
          .on('close', async () => {
            try {
              const files = fs.readdirSync(unzipPath);
              const invalidFiles = files.filter(file => !file.endsWith('.rec'));

              if (invalidFiles.length > 0) {
                return reject('Incorrect replay structure. The Zip file should only have .rec files in it');
              }

              const newFolderName = `${originalName}-${teamName}`;
              const newFolderPath = `uploads/${newFolderName}`;
              if (fs.existsSync(newFolderPath)) {
                return reject(`Error: Folder already exists: ${newFolderPath}`);
              }

              fs.renameSync(unzipPath, newFolderPath);

              const s3Path = `${bucketName}/${newFolderName}`;
              await uploadToS3(newFolderPath, s3Path);
              resolve('Upload successful');
            } catch (err) {
              reject(`Error processing upload: ${err.message}`);
            }
          });
      });

      uploadPromises.push(unzipAndUpload);
    }

    await Promise.all(uploadPromises).catch(err => {
      allUploadsSuccessful = false;
      throw err;
    });

    if (allUploadsSuccessful) {
      const lockFileExists = await checkFileExists(bucketName, 'upload.lock');
      if (!lockFileExists) {
        await s3.putObject({
          Bucket: bucketName,
          Key: 'upload.lock',
          Body: 'lock',
        }).promise();

        setTimeout(async () => {
          try {
            const stillLockFileExists = await checkFileExists(bucketName, 'upload.lock');
            if (stillLockFileExists) {
              await uploadCompleteFile();
              await s3.deleteObject({ Bucket: bucketName, Key: 'upload.lock' }).promise();
            }
          } catch (err) {
            console.error('Error during lock file handling:', err.message);
          }
        }, 5000);
      }
    }

    res.send('Upload successful');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
