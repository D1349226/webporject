const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

const items = [
  { type: 'lost', title: '黑色 AirPods Pro', category: '電子產品', description: '黑色耳機盒，左耳有小刮痕，遺失於圖書館二樓閱覽區。', date: '2026-06-10', location: '圖書館二樓', status: 'active' },
  { type: 'found', title: '學生證', category: '證件', description: '撿到一張學生證，姓名已模糊，請失主憑相片認領。', date: '2026-06-11', location: '學生餐廳門口', status: 'active' },
  { type: 'lost', title: '藍色雨傘', category: '雨傘', description: '深藍色自動收納傘，把手有磨損，忘記在教室。', date: '2026-06-09', location: '人文大樓 301 教室', status: 'claimed' },
  { type: 'found', title: '鑰匙圈（三把鑰匙）', category: '鑰匙', description: '一串附有小貓吊飾的鑰匙，共三把，放在工學院大廳服務台。', date: '2026-06-12', location: '工學院大廳', status: 'active' },
  { type: 'lost', title: '紅色圍巾', category: '衣物', description: '針織紅色格紋圍巾，遺失於體育館更衣室附近。', date: '2026-06-08', location: '體育館', status: 'closed' },
  { type: 'found', title: '計算機', category: '文具', description: '卡西歐科學型計算機 fx-991，後蓋有貼紙，撿到於數學系走廊。', date: '2026-06-13', location: '數學系二樓走廊', status: 'active' },
  { type: 'lost', title: 'MacBook 充電器', category: '電子產品', description: '61W USB-C 充電器，白色，忘記在自習室插座旁。', date: '2026-06-14', location: '圖書館自習室', status: 'active' },
  { type: 'found', title: '眼鏡（黑框）', category: '眼鏡', description: '黑色細框近視眼鏡，撿到於操場看台座位。', date: '2026-06-07', location: '操場看台', status: 'active' },
  { type: 'lost', title: '白色帽T', category: '衣物', description: '白色帽T，胸前印有英文字母，尺寸 M，遺留在籃球場旁。', date: '2026-06-06', location: '籃球場', status: 'active' },
  { type: 'found', title: '錢包（棕色皮革）', category: '錢包', description: '棕色男用皮夾，內有少許現金與悠遊卡，交由學務處保管。', date: '2026-06-15', location: '學務處', status: 'claimed' },
  { type: 'lost', title: 'Switch 遊戲卡帶', category: '電子產品', description: '薩爾達傳說：王國之淚遊戲卡帶，可能掉在宿舍交誼廳。', date: '2026-06-13', location: '宿舍交誼廳', status: 'active' },
  { type: 'found', title: '耳機（有線）', category: '電子產品', description: '黑色有線耳機，3.5mm 插頭，撿到於電腦教室桌上。', date: '2026-06-16', location: '電腦教室 B201', status: 'active' },
  { type: 'lost', title: '藍牙滑鼠', category: '電子產品', description: '羅技無線滑鼠，白色，底部有編號貼紙，遺失於設計系工作室。', date: '2026-06-10', location: '設計系工作室', status: 'active' },
  { type: 'found', title: '運動水壺', category: '其他', description: '黑色不鏽鋼保溫瓶，500ml，瓶身有貼紙裝飾，撿到於跑道旁。', date: '2026-06-17', location: '田徑場跑道旁', status: 'active' },
  { type: 'lost', title: '護照', category: '證件', description: '台灣護照，封面有磨損，遺失於出國說明會會場，急尋！', date: '2026-06-18', location: '國際事務處', status: 'active' },
  { type: 'found', title: '手錶（銀色）', category: '飾品', description: '銀色金屬錶帶手錶，撿到於男廁洗手台旁，已交管理員。', date: '2026-06-11', location: '理學院男廁', status: 'active' },
  { type: 'lost', title: '素描本', category: '文具', description: 'A4 黑色封面素描本，內有多幅鉛筆素描，對本人有紀念價值。', date: '2026-06-09', location: '藝術中心', status: 'closed' },
  { type: 'found', title: '口罩一包', category: '其他', description: '未拆封醫療口罩一盒，撿到於走廊，如需請認領。', date: '2026-06-19', location: '社科院一樓走廊', status: 'active' },
  { type: 'lost', title: '黃色便利貼筆記本', category: '文具', description: '封面貼滿便利貼的小筆記本，內有課堂筆記，遺失於演講廳。', date: '2026-06-18', location: '第一演講廳', status: 'active' },
  { type: 'found', title: '充電寶（10000mAh）', category: '電子產品', description: '白色行動電源，品牌 ASUS，撿到於機車停車場長椅上。', date: '2026-06-20', location: '機車停車場', status: 'active' },
];

db.serialize(() => {
  // 確保 admin 存在，取得其 id
  db.get(`SELECT id FROM users WHERE username = 'admin'`, (err, row) => {
    const adminId = row ? row.id : 1;
    const stmt = db.prepare(`
      INSERT INTO items (type, title, category, description, date, location, status, owner_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    items.forEach(item => {
      stmt.run(item.type, item.title, item.category, item.description, item.date, item.location, item.status, adminId);
    });
    stmt.finalize(() => {
      console.log('已新增 20 筆範例資料');
      db.close();
    });
  });
});
