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
  const uploadPath = path.join(__dirname, 'uploads', zipFile.name);
  const extractedPath = path.join(__dirname, 'uploads', zipFile.name.split('.zip')[0]);

  // Ensure the uploads directory exists
  if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'));
  }

  console.log(`Received file: ${zipFile.name}, size: ${zipFile.size} bytes`);

  if (zipFile.size > 500 * 1024 * 1024) { // 500MB limit
    console.error('File size exceeds limit.');
    return res.status(400).send('File size exceeds limit.');
  }

  zipFile.mv(uploadPath, async (err) => {
    if (err) {
      console.error('Error moving file:', err);
      return res.status(500).send(err);
    }

    console.log(`File saved to ${uploadPath}`);

    // Extract the zip file
    fs.createReadStream(uploadPath)
      .pipe(unzipper.Extract({ path: extractedPath }))
      .on('close', () => {
        console.log(`Extracted zip file to ${extractedPath}`);
        
        // List contents of the extracted directory
        fs.readdir(extractedPath, (err, files) => {
          if (err) {
            console.error('Error reading extracted directory:', err);
            return res.status(500).send('Error reading extracted directory.');
          }

          console.log('Extracted files:', files);

          // Check if all files are .rec files
          if (!files.every(file => file.endsWith('.rec'))) {
            console.error('All files inside the zip must be .rec files.');
            return res.status(400).send('All files inside the zip must be .rec files.');
          }

          const folderName = `${zipFile.name.split('.zip')[0]}-${req.body.team}`;
          const command = `aws s3 cp ${extractedPath} s3://tlmrisserver/pre-exported-data/${folderName}/ --recursive`;

          console.log(`Executing command: ${command}`);

          exec(command, (err, stdout, stderr) => {
            if (err) {
              console.error('Error uploading files:', err);
              console.error('stdout:', stdout);
              console.error('stderr:', stderr);
              return res.status(500).send('Error uploading files.');
            }
            console.log('Files uploaded successfully:', stdout);
            res.send('Files uploaded successfully.');
          });
        });
      })
      .on('error', (err) => {
        console.error('Error extracting zip file:', err);
        return res.status(500).send('Error extracting zip file.');
      });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
