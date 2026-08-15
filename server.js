const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Path to the mantra-naam root (now the same directory)
const REPO_ROOT = __dirname;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(REPO_ROOT, 'public')));
app.use('/mantras', express.static(path.join(REPO_ROOT, 'mantras')));
app.use('/naams', express.static(path.join(REPO_ROOT, 'naams')));
app.use('/audio', express.static(path.join(REPO_ROOT, 'audio')));
app.use('/images', express.static(path.join(REPO_ROOT, 'images')));

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const type = req.params.type;
        // Verify type is valid
        if (type !== 'image' && type !== 'audio') {
            return cb(new Error('Invalid upload type'));
        }
        // Map type to directory
        const destFolder = type === 'image' ? 'images' : 'audio';
        const destPath = path.join(REPO_ROOT, destFolder);
        
        if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
        }
        cb(null, destPath);
    },
    filename: function (req, file, cb) {
        // Use customName if provided, otherwise fallback to original filename
        let nameToUse = file.originalname;
        if (req.body.customName && req.body.customName.trim() !== '') {
            let customName = req.body.customName.trim();
            // Ensure the custom name has the correct extension
            const ext = path.extname(file.originalname);
            if (!customName.endsWith(ext)) {
                customName += ext;
            }
            nameToUse = customName;
        }
        
        // Ensure it's safe
        const safeName = nameToUse.replace(/[^a-zA-Z0-9.\-_]/g, '');
        cb(null, safeName);
    }
});

const upload = multer({ storage: storage });

// API: Upload a file
app.post('/api/upload/:type', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return the filename so the UI can populate the input
    res.json({ filename: req.file.filename, path: `${req.params.type === 'image' ? 'images' : 'audio'}/${req.file.filename}` });
});

// Helper to recursively find all JSON files in a directory
function findJsonFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        // Skip .git, node_modules, editor
        if (['.git', '.idea', 'node_modules', 'editor'].includes(file)) continue;

        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findJsonFiles(filePath, fileList);
        } else if (file.endsWith('.json')) {
            // Store path relative to REPO_ROOT
            fileList.push(path.relative(REPO_ROOT, filePath).replace(/\\/g, '/'));
        }
    }
    return fileList;
}

// API: List all JSON files in mantras and naams
app.get('/api/files', (req, res) => {
    try {
        const mantrasDir = path.join(REPO_ROOT, 'mantras');
        const naamsDir = path.join(REPO_ROOT, 'naams');
        
        let allFiles = [];
        if (fs.existsSync(mantrasDir)) {
            allFiles = allFiles.concat(findJsonFiles(mantrasDir));
        }
        if (fs.existsSync(naamsDir)) {
            allFiles = allFiles.concat(findJsonFiles(naamsDir));
        }
        
        res.json({ files: allFiles });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

// API: Get content of a specific file
app.get('/api/file', (req, res) => {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'Path is required' });

    try {
        // Prevent directory traversal
        const absolutePath = path.resolve(REPO_ROOT, filePath);
        if (!absolutePath.startsWith(path.resolve(REPO_ROOT))) {
            return res.status(403).json({ error: 'Invalid path' });
        }

        if (!fs.existsSync(absolutePath)) {
             return res.status(404).json({ error: 'File not found' });
        }

        const content = fs.readFileSync(absolutePath, 'utf8');
        res.json({ content: JSON.parse(content) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to read file' });
    }
});

// API: Save content to a specific file
app.post('/api/file', (req, res) => {
    const filePath = req.body.path;
    const content = req.body.content;

    if (!filePath || !content) return res.status(400).json({ error: 'Path and content are required' });

    try {
        // Prevent directory traversal
        const absolutePath = path.resolve(REPO_ROOT, filePath);
        if (!absolutePath.startsWith(path.resolve(REPO_ROOT))) {
            return res.status(403).json({ error: 'Invalid path' });
        }

        // Ensure directory exists
        const dir = path.dirname(absolutePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Format JSON cleanly before saving
        const jsonString = JSON.stringify(content, null, 2);
        fs.writeFileSync(absolutePath, jsonString, 'utf8');
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save file' });
    }
});

app.listen(PORT, () => {
    console.log(`JSON Editor Server running at http://localhost:${PORT}`);
});
