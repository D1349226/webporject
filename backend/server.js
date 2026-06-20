require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'campus-lost-found-secret-key';

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// ── 生產環境：服務前端打包檔 ─────────────────────────────
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
}

// ── 靜態檔案 ──────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── Multer 上傳設定 ───────────────────────────────────────
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadsDir),
        filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) return cb(new Error('僅允許 jpg、png、webp 或 gif'));
        cb(null, true);
    }
});

function handleUpload(req, res, next) {
    upload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE')
            return res.status(400).json({ error: '圖片不能超過 5MB' });
        if (err) return res.status(400).json({ error: err.message });
        next();
    });
}

// ── 資料庫 ────────────────────────────────────────────────
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
    if (err) console.error('資料庫連線失敗:', err.message);
    else console.log('已連線至 SQLite 資料庫');
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

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
            status TEXT DEFAULT 'active',
            owner_id INTEGER,
            FOREIGN KEY(owner_id) REFERENCES users(id)
        )
    `);

    // 若 owner_id 欄位不存在（舊資料庫升級）則補上
    db.run(`ALTER TABLE items ADD COLUMN owner_id INTEGER REFERENCES users(id)`, () => {});

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

    // 建立預設管理員帳號（admin / admin123）
    const adminPw = bcrypt.hashSync('admin123', 10);
    db.run(
        `INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', ?, 'admin')`,
        [adminPw]
    );
});

// ── Auth Middleware ───────────────────────────────────────
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '請先登入' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: '登入已過期，請重新登入' });
    }
}

function adminOnly(req, res, next) {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: '僅管理員可執行此操作' });
    next();
}

// ── Auth API ─────────────────────────────────────────────

// 註冊
app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '帳號與密碼為必填' });
    if (password.length < 6) return res.status(400).json({ error: '密碼至少 6 個字元' });

    const hash = bcrypt.hashSync(password, 10);
    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hash, 'user'], function(err) {
        if (err) return res.status(409).json({ error: '帳號已存在' });
        const token = jwt.sign({ id: this.lastID, username, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: this.lastID, username, role: 'user' } });
    });
});

// 登入
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '帳號與密碼為必填' });

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user || !bcrypt.compareSync(password, user.password))
            return res.status(401).json({ error: '帳號或密碼錯誤' });

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    });
});

// 取得目前登入者資訊
app.get('/api/auth/me', authMiddleware, (req, res) => {
    db.get('SELECT id, username, role, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: '使用者不存在' });
        res.json(user);
    });
});

// ── 使用者管理（管理員） ──────────────────────────────────

// 取得全部使用者列表
app.get('/api/users', authMiddleware, adminOnly, (req, res) => {
    db.all('SELECT id, username, role, created_at FROM users ORDER BY id', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 更改使用者角色
app.patch('/api/users/:id/role', authMiddleware, adminOnly, (req, res) => {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: '角色只能是 admin 或 user' });
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: '不能修改自己的角色' });

    db.run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: '找不到該使用者' });
        res.json({ message: '角色更新成功' });
    });
});

// 刪除使用者
app.delete('/api/users/:id', authMiddleware, adminOnly, (req, res) => {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: '不能刪除自己的帳號' });
    db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: '找不到該使用者' });
        res.json({ message: '刪除成功' });
    });
});

// ── Items API ─────────────────────────────────────────────

// 取得物品列表（公開）
app.get('/api/items', (req, res) => {
    const { type, category, search, status, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = "WHERE i.status != 'deleted'";
    const params = [];

    if (status) { where += ' AND i.status = ?'; params.push(status); }
    if (type) { where += ' AND i.type = ?'; params.push(type); }
    if (category) { where += ' AND i.category = ?'; params.push(category); }
    if (search) {
        where += ' AND (i.title LIKE ? OR i.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    const baseQuery = `FROM items i LEFT JOIN users u ON i.owner_id = u.id ${where}`;
    db.get(`SELECT COUNT(*) AS total ${baseQuery}`, params, (err, countRow) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all(
            `SELECT i.*, u.username AS owner_name ${baseQuery} ORDER BY i.id DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset],
            (err2, rows) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ items: rows, total: countRow.total, page: parseInt(page), limit: parseInt(limit) });
            }
        );
    });
});

// 各狀態數量（公開）
app.get('/api/items/counts', (req, res) => {
    db.all(`SELECT status, COUNT(*) AS count FROM items WHERE status != 'deleted' GROUP BY status`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const result = { active: 0, claimed: 0, closed: 0 };
        rows.forEach(r => { result[r.status] = r.count; });
        result.all = result.active + result.claimed + result.closed;
        res.json(result);
    });
});

// 新增物品（需登入）
app.post('/api/items', authMiddleware, handleUpload, (req, res) => {
    const { type, title, category, description, date, location } = req.body;
    if (!type || !title) return res.status(400).json({ error: '種類與標題為必填' });

    db.run(
        `INSERT INTO items (type, title, category, description, date, location, image, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [type, title, category, description, date, location, req.file?.filename || null, req.user.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID, message: '上傳成功' });
        }
    );
});

// 取得單一物品（公開）
app.get('/api/items/:id', (req, res) => {
    db.get(
        `SELECT i.*, u.username AS owner_name FROM items i LEFT JOIN users u ON i.owner_id = u.id WHERE i.id = ?`,
        [req.params.id],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: '找不到該物品' });
            res.json(row);
        }
    );
});

// 更新狀態（本人或管理員）
app.patch('/api/items/:id/status', authMiddleware, (req, res) => {
    const { status } = req.body;
    if (!['active', 'claimed', 'closed'].includes(status))
        return res.status(400).json({ error: '無效的狀態值' });

    db.get('SELECT * FROM items WHERE id = ?', [req.params.id], (err, item) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!item) return res.status(404).json({ error: '找不到該物品' });
        if (req.user.role !== 'admin' && item.owner_id !== req.user.id)
            return res.status(403).json({ error: '只能修改自己的物品' });

        db.run('UPDATE items SET status = ? WHERE id = ?', [status, req.params.id], function(err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ message: '狀態更新成功' });
        });
    });
});

// 修改物品（本人或管理員）
app.put('/api/items/:id', authMiddleware, handleUpload, (req, res) => {
    const { type, title, category, description, date, location } = req.body;
    if (!type || !title) return res.status(400).json({ error: '種類與標題為必填' });

    db.get('SELECT * FROM items WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: '找不到該物品' });
        if (req.user.role !== 'admin' && row.owner_id !== req.user.id)
            return res.status(403).json({ error: '只能修改自己的物品' });

        const newImage = req.file ? req.file.filename : row.image;
        db.run(
            `UPDATE items SET type=?, title=?, category=?, description=?, date=?, location=?, image=? WHERE id=?`,
            [type, title, category, description, date, location, newImage, req.params.id],
            function(err2) {
                if (err2) return res.status(500).json({ error: err2.message });
                if (req.file && row.image) fs.unlink(path.join(uploadsDir, row.image), () => {});
                res.json({ message: '修改成功' });
            }
        );
    });
});

// 軟刪除（本人或管理員）
app.delete('/api/items/:id', authMiddleware, (req, res) => {
    db.get('SELECT * FROM items WHERE id = ?', [req.params.id], (err, item) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!item) return res.status(404).json({ error: '找不到該物品' });
        if (req.user.role !== 'admin' && item.owner_id !== req.user.id)
            return res.status(403).json({ error: '只能刪除自己的物品' });

        db.run("UPDATE items SET status = 'deleted' WHERE id = ?", [req.params.id], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ message: '已移至垃圾桶' });
        });
    });
});

// 垃圾桶列表（管理員：全部；一般使用者：自己的）
app.get('/api/items/trash', authMiddleware, (req, res) => {
    const sql = req.user.role === 'admin'
        ? "SELECT i.*, u.username AS owner_name FROM items i LEFT JOIN users u ON i.owner_id = u.id WHERE i.status = 'deleted' ORDER BY i.id DESC"
        : "SELECT i.*, u.username AS owner_name FROM items i LEFT JOIN users u ON i.owner_id = u.id WHERE i.status = 'deleted' AND i.owner_id = ? ORDER BY i.id DESC";
    const params = req.user.role === 'admin' ? [] : [req.user.id];
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 還原（本人或管理員）
app.patch('/api/items/:id/restore', authMiddleware, (req, res) => {
    db.get('SELECT * FROM items WHERE id = ?', [req.params.id], (err, item) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!item) return res.status(404).json({ error: '找不到該物品' });
        if (req.user.role !== 'admin' && item.owner_id !== req.user.id)
            return res.status(403).json({ error: '只能還原自己的物品' });

        db.run("UPDATE items SET status = 'active' WHERE id = ? AND status = 'deleted'", [req.params.id], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ message: '還原成功' });
        });
    });
});

// 永久刪除（本人或管理員）
app.delete('/api/items/:id/permanent', authMiddleware, (req, res) => {
    db.get('SELECT * FROM items WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: '找不到該物品' });
        if (req.user.role !== 'admin' && row.owner_id !== req.user.id)
            return res.status(403).json({ error: '只能刪除自己的物品' });

        db.serialize(() => {
            db.run('DELETE FROM claims WHERE item_id = ?', [req.params.id]);
            db.run('DELETE FROM items WHERE id = ?', [req.params.id], (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                if (row.image) fs.unlink(path.join(uploadsDir, row.image), () => {});
                res.json({ message: '永久刪除成功' });
            });
        });
    });
});

// 提交認領（需登入）
app.post('/api/claims', authMiddleware, (req, res) => {
    const { item_id, claimer_name, contact_info, claim_reason } = req.body;
    if (!item_id || !claimer_name || !contact_info)
        return res.status(400).json({ error: '物品ID、認領人與聯絡方式為必填' });

    db.serialize(() => {
        db.run(`INSERT INTO claims (item_id, claimer_name, contact_info, claim_reason) VALUES (?, ?, ?, ?)`,
            [item_id, claimer_name, contact_info, claim_reason]);
        db.run(`UPDATE items SET status = 'claimed' WHERE id = ?`, [item_id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: '認領申請提交成功' });
        });
    });
});

// ── 生產環境：所有非 API 路由回傳 index.html ─────────────
if (fs.existsSync(publicDir)) {
    app.get('*', (req, res) => {
        res.sendFile(path.join(publicDir, 'index.html'));
    });
}

app.listen(PORT, () => console.log(`後端伺服器正運行於 http://localhost:${PORT}`));
