import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'dist'))); // Serve Vite built frontend
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files

// Configure Multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Keep original name but add timestamp to avoid duplicates
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// API: Upload file
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  
  // Return the file access URL
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    fileUrl: fileUrl,
    filename: req.file.originalname,
    size: req.file.size
  });
});

// API: List all files
app.get('/api/files', (req, res) => {
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    return res.json([]);
  }

  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan directory');
    }
    
    // Map files to include their URL and stats
    const fileList = files.map(file => {
      const stats = fs.statSync(path.join(uploadDir, file));
      // Remove the unique suffix to show clean original name (everything after the first '-')
      const originalName = file.substring(file.indexOf('-') + 1);
      // Wait, our suffix format is timestamp-random-originalname. It has 2 dashes.
      const nameParts = file.split('-');
      nameParts.shift(); // remove timestamp
      nameParts.shift(); // remove random
      const cleanName = nameParts.join('-');

      return {
        filename: cleanName || file,
        url: `/uploads/${file}`,
        size: stats.size,
        date: stats.birthtime
      };
    });

    // Sort by newest first
    fileList.sort((a, b) => b.date - a.date);
    res.json(fileList);
  });
});

// Handle wildcard for SPA
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
