const express = require('express');
const fileUpload = require('express-fileupload');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const unzipper = require('unzipper');

const app = express();
const PORT = 5001;

// Using express-fileupload for existing functionality
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'build')));

// Set up Multer for new upload functionality
const multerStorage = multer.memoryStorage();
const upload = multer({
    storage: multerStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // Limit size to 50MB per file
    fileFilter: function (req, file, cb) {
        if (path.extname(file.originalname) !== '.zip') {
            return cb(new Error('Only zip files are allowed'), false);
        }
        cb(null, true);
    }
}).array('files', 5); // Accept up to 5 files

// Route for uploading replay files
app.post('/upload', async (req, res) => {
    if (!req.files || !req.files.file) {
        console.error('No files were uploaded.');
        return res.status(400).send('No files were uploaded.');
    }

    const {
        team1, team2, attackingBan1, attackingBan2, defensiveBan1, defensiveBan2, playday, match
    } = req.body;

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
            .on('close', async () => {
                console.log(`Extracted zip file to ${extractedPath}`);

                try {
                    // Collect all files recursively
                    const files = await collectRecFiles(extractedPath);

                    // Check if all files are .rec files
                    if (!files.every(file => file.endsWith('.rec'))) {
                        console.error('All files inside the zip must be .rec files.');
                        return res.status(400).send('All files inside the zip must be .rec files.');
                    }

                    const folderName = `${team1}-VS-${team2}-${attackingBan1}-${attackingBan2}-${defensiveBan1}-${defensiveBan2}-${playday}-${match}`;
                    const uploadCommand = `aws s3 cp ${extractedPath} s3://tlmrisserver/pre-exported-data/${folderName}/ --recursive --exclude "*" --include "*.rec"`;

                    console.log(`Executing command: ${uploadCommand}`);

                    exec(uploadCommand, (err, stdout, stderr) => {
                        if (err) {
                            console.error('Error uploading files:', err);
                            console.error('stdout:', stdout);
                            console.error('stderr:', stderr);
                            return res.status(500).send('Error uploading files.');
                        }
                        console.log('Files uploaded successfully:', stdout);
                        res.send('Files uploaded successfully.');
                    });
                } catch (err) {
                    console.error('Error processing files:', err);
                    return res.status(500).send('Error processing files.');
                }
            })
            .on('error', (err) => {
                console.error('Error extracting zip file:', err);
                return res.status(500).send('Error extracting zip file.');
            });
    });
});

// New route for MOSS files upload
app.post('/upload-moss', (req, res) => {
    upload(req, res, function (error) {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        if (!req.files || req.files.length === 0) {
            return res.status(400).send('No files were uploaded.');
        }

        req.files.forEach(async file => {
            const localFilePath = `/tmp/${Date.now()}_${file.originalname}`;
            fs.writeFileSync(localFilePath, file.buffer);

            const s3UploadCommand = `aws s3 cp ${localFilePath} s3://tlmrisserver/MOSS Files/${Date.now()}_${file.originalname}`;

            exec(s3UploadCommand, (err, stdout, stderr) => {
                if (err) {
                    console.error(`Error uploading file: ${file.originalname}`, err);
                    console.error('stdout:', stdout);
                    console.error('stderr:', stderr);
                    return res.status(500).send('Error uploading files.');
                }
                console.log(`File uploaded successfully: ${stdout}`);
                fs.unlinkSync(localFilePath); // Clean up the local file
            });
        });

        res.send('Files uploaded successfully!');
    });
});

const collectRecFiles = async (dir) => {
    let results = [];
    const list = await fs.promises.readdir(dir);

    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = await fs.promises.stat(filePath);

        if (stat && stat.isDirectory()) {
            const res = await collectRecFiles(filePath);
            results = results.concat(res);
        } else {
            results.push(filePath);
        }
    }

    return results;
};

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
