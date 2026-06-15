const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 1. 使用絕對路徑設定靜態檔案資料夾與自動建立機制
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('已成功自動建立 uploads 資料夾：', uploadsDir);
}

// 2. Multer 圖片上傳設定
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir); 
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// 3. 初始化資料庫 (使用絕對路нк)
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('資料庫連線失敗:', err.message);
    else console.log('已成功連線至 SQLite 資料庫：', dbPath);
});

// 4. 建立資料表 (確保含有 image 欄位)
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            category TEXT,
            description TEXT,
            date TEXT,
            location TEXT,
            image TEXT,
            status TEXT DEFAULT 'active'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER,
            claimer_name TEXT NOT NULL,
            contact_info TEXT NOT NULL,
            claim_reason TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(item_id) REFERENCES items(id)
        )
    `);
});

// API 1: 取得物品列表（修正 res 參數手誤）
app.get('/api/items', (req, res) => {
    const { type, category, search } = req.query;
    let sql = 'SELECT * FROM items WHERE 1=1';
    const params = [];

    if (type) { sql += ' AND type = ?'; params.push(type); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (search) {
        sql += ' AND (title LIKE ? OR description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY id DESC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API 2: 新增物品啟事 (含單張圖片上傳)
app.post('/api/items', upload.single('image'), (req, res) => {
    const { type, title, category, description, date, location } = req.body;
    if (!type || !title) return res.status(400).json({ error: '種類與標題為必填項目' });

    const imageName = req.file ? req.file.filename : null;

    const sql = `INSERT INTO items (type, title, category, description, date, location, image) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [type, title, category, description, date, location, imageName], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, message: '上傳成功' });
    });
});

// API 3: 取得特定物品詳細資訊
app.get('/api/items/:id', (req, res) => {
    const sql = 'SELECT * FROM items WHERE id = ?';
    db.get(sql, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: '找不到該物品' });
        res.json(row);
    });
});

// API 4: 提交認領申請
app.post('/api/claims', (req, res) => {
    const { item_id, claimer_name, contact_info, claim_reason } = req.body;
    if (!item_id || !claimer_name || !contact_info) {
        return res.status(400).json({ error: '物品ID、認領人與聯絡方式為必填' });
    }
    db.serialize(() => {
        const insertClaim = `INSERT INTO claims (item_id, claimer_name, contact_info, claim_reason) VALUES (?, ?, ?, ?)`;
        db.run(insertClaim, [item_id, claimer_name, contact_info, claim_reason]);

        const updateItem = `UPDATE items SET status = 'claimed' WHERE id = ?`;
        db.run(updateItem, [item_id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: '認領申請提交成功' });
        });
    });
});

app.listen(PORT, () => {
    console.log(`後端伺服器正運行於 http://localhost:${PORT}`);
});