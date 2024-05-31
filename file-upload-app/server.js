const express = require('express');
const fileUpload = require('express-fileupload');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const unzipper = require('unzipper');

const app = express();
const PORT = 5001;

app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'build')));

app.post('/upload', async (req, res) => {
  if (!req.files || !req.files.file) {
    console.error('No files were uploaded.');
    return res.status(400).send('No files were uploaded.');
  }

  const zipFile = req.files.file;
  console.log(`Received file: ${zipFile.name}, size: ${zipFile.size} bytes`);

  if (zipFile.size > 200 * 1024 * 1024) { // 200MB limit
    console.error('File size exceeds limit.');
    return res.status(400).send('File size exceeds limit.');
  }

  const uploadPath = path.join(__dirname, 'uploads', zipFile.name);

  zipFile.mv(uploadPath, async (err) => {
    if (err) {
      console.error('Error moving file:', err);
      return res.status(500).send(err);
    }

    const directory = await unzipper.Open.file(uploadPath);

    if (!directory.files.every(file => file.path.endsWith('.rec'))) {
      fs.unlinkSync(uploadPath);
      console.error('All files inside the zip must be .rec files.');
      return res.status(400).send('All files inside the zip must be .rec files.');
    }

    const folderName = `${zipFile.name.split('.zip')[0]}-${req.body.team}`;
    const command = `aws s3 cp ${uploadPath} s3://tlmrisserver/pre-exported-data/${folderName}/ --recursive`;

    exec(command, (err, stdout, stderr) => {
      fs.unlinkSync(uploadPath);
      if (err) {
        console.error('Error uploading files:', err);
        return res.status(500).send('Error uploading files.');
      }
      console.log('Files uploaded successfully:', stdout);
      res.send('Files uploaded successfully.');
    });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
