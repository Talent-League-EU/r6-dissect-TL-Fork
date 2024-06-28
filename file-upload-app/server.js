const express = require('express');
const fileUpload = require('express-fileupload');
const multer = require('multer');
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
    limits: { fileSize: 500 * 1024 * 1024 }, // Limit size to 50MB per file
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname) !== '.zip') {
            return cb(new Error('Only zip files are allowed'), false);
        }
        cb(null, true);
    }
}).array('files', 5); // Accept up to 5 files

console.log("Server configuration complete");

app.post('/upload', async (req, res) => {
    console.log("Upload endpoint hit");
    if (!req.files || !req.files.file) {
        console.error('No files were uploaded.');
        return res.status(400).send('No files were uploaded.');
    }

    const { team1, team2, attackingBan1, attackingBan2, defensiveBan1, defensiveBan2, playday, match } = req.body;
    const zipFile = req.files.file;
    const uploadPath = path.join(__dirname, 'uploads', zipFile.name);
    const extractedPath = path.join(__dirname, 'uploads', zipFile.name.split('.zip')[0]);

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

        fs.createReadStream(uploadPath)
            .pipe(unzipper.Extract({ path: extractedPath }))
            .on('close', async () => {
                console.log(`Extracted zip file to ${extractedPath}`);

                try {
                    const files = await collectRecFiles(extractedPath);

                    if (!files.every(file => file.endsWith('.rec'))) {
                        console.error('All files inside the zip must be .rec files.');
                        return res.status(400).send('All files inside the zip must be .rec files.');
                    }

                    const folderName = `${team1}-VS-${team2}-${attackingBan1}-${attackingBan2}-${defensiveBan1}-${defensiveBan2}-${playday}-${match}`;
                    const newFolderPath = path.join(__dirname, 'uploads', folderName);

                    if (!fs.existsSync(newFolderPath)) {
                        fs.mkdirSync(newFolderPath);
                    }

                    files.forEach(file => {
                        const fileName = path.basename(file);
                        fs.renameSync(file, path.join(newFolderPath, fileName));
                    });

                    const uploadCommand = `aws s3 cp ${newFolderPath} s3://tlmrisserver/pre-exported-data/${folderName}/ --recursive --exclude "*" --include "*.rec"`;

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

async function collectRecFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = entries.flatMap(entry => {
        const fullPath = path.join(dir, entry.name);
        return entry.isDirectory() ? collectRecFiles(fullPath) : [fullPath];
    });
    return files.filter(file => file.endsWith('.rec'));
}

app.post('/upload-moss', (req, res) => {
    console.log("MOSS upload endpoint hit");
    upload(req, res, function (error) {
        if (error) {
            console.error("Multer error:", error);
            return res.status(500).json({ error: error.message });
        }
        if (!req.files || req.files.length === 0) {
            console.error("No files were uploaded.");
            return res.status(400).send('No files were uploaded.');
        }

        req.files.forEach(file => {
            const localFilePath = `/tmp/${Date.now()}_${file.originalname}`;
            fs.writeFileSync(localFilePath, file.buffer);

            const s3UploadCommand = `aws s3 cp ${localFilePath} s3://tlmrisserver/MOSS Files/${Date.now()}_${file.originalname}`;
            console.log(`Executing command: ${s3UploadCommand}`);

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

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
