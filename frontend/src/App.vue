<template>
  <div class="container">
    <h1>🏫 校園失物招領系統</h1>

    <div class="tabs">
      <button :class="{ active: currentTab === 'list' }" @click="currentTab = 'list'">物品列表</button>
      <button :class="{ active: currentTab === 'post' }" @click="currentTab = 'post'">發布啟事</button>
    </div>

    <div v-if="currentTab === 'list'">
      <div class="filter-bar">
        <select v-model="filters.type" @change="fetchItems">
          <option value="">全部類型</option>
          <option value="lost">遺失物 (求尋找)</option>
          <option value="found">拾獲物 (求認領)</option>
        </select>

        <select v-model="filters.category" @change="fetchItems">
          <option value="">全部分類</option>
          <option value="電子產品">電子產品</option>
          <option value="文具書籍">文具書籍</option>
          <option value="皮夾證件">皮夾證件</option>
          <option value="其他">其他</option>
        </select>

        <input type="text" v-model="filters.search" placeholder="搜尋關鍵字..." @input="fetchItems" />
      </div>

      <div class="grid">
        <div v-for="item in items" :key="item.id" class="card" :class="{ claimed: item.status === 'claimed' }">
          <span class="badge" :class="item.type">{{ item.type === 'lost' ? '遺失' : '拾獲' }}</span>
          
          <div class="image-preview-box">
            <img v-if="item.image" :src="`http://localhost:3000/uploads/${item.image}`" alt="物品圖片" class="item-img" />
            <div v-else class="no-img-placeholder">
              {{ getDefaultEmoji(item.category) }}
            </div>
          </div>

          <h3>{{ item.title }}</h3>
          <p><strong>分類：</strong>{{ item.category }}</p>
          <p><strong>地點：</strong>{{ item.location }}</p>
          <p><strong>日期：</strong>{{ item.date }}</p>
          <p class="status-text">狀態：{{ item.status === 'active' ? '刊登中' : '已認領/結案' }}</p>
          <button @click="viewDetail(item.id)">查看詳情</button>
        </div>
      </div>
    </div>

    <div v-if="currentTab === 'post'" class="form-container">
      <h2>新增刊登</h2>
      <form @submit.prevent="submitItem">
        <label>刊登類型：</label>
        <select v-model="newItem.type" required>
          <option value="lost">我弄丟了東西 (遺失物)</option>
          <option value="found">我撿到了東西 (拾獲物)</option>
        </select>

        <label>物品名稱：</label>
        <input type="text" v-model="newItem.title" required placeholder="例如：iPhone 13、黑色錢包" />

        <label>物品分類：</label>
        <select v-model="newItem.category">
          <option value="電子產品">電子產品</option>
          <option value="文具書籍">文具書籍</option>
          <option value="皮夾證件">皮夾證件</option>
          <option value="其他">其他</option>
        </select>

        <label>上傳物品圖片：</label>
        <input type="file" @change="handleFileUpload" accept="image/*" />
        <img v-if="imagePreview" :src="imagePreview" class="upload-preview" />

        <label>發生日期：</label>
        <input type="date" v-model="newItem.date" />

        <label>預期地點：</label>
        <input type="text" v-model="newItem.location" placeholder="例如：工程四館 101 教室" />

        <label>詳細特徵：</label>
        <textarea v-model="newItem.description" placeholder="請描述物品外觀、特徵..."></textarea>

        <button type="submit" class="btn-success">確認發布</button>
      </form>
    </div>

    <div v-if="selectedItem" class="modal-overlay" @click.self="selectedItem = null">
      <div class="modal">
        <h2>【{{ selectedItem.type === 'lost' ? '遺失' : '拾獲' }}】{{ selectedItem.title }}</h2>
        <hr />
        
        <div class="modal-image-box" v-if="selectedItem.image">
          <img :src="`http://localhost:3000/uploads/${selectedItem.image}`" class="modal-img" />
        </div>

        <p><strong>分類：</strong> {{ selectedItem.category }}</p>
        <p><strong>時間：</strong> {{ selectedItem.date }}</p>
        <p><strong>地點：</strong> {{ selectedItem.location }}</p>
        <p><strong>描述：</strong> {{ selectedItem.description || '無詳細說明' }}</p>
        <p><strong>目前狀態：</strong> {{ selectedItem.status === 'active' ? '處理中' : '已結案' }}</p>

        <div v-if="selectedItem.status === 'active'" class="claim-box">
          <h3>申請認領 / 聯絡告知</h3>
          <form @submit.prevent="submitClaim">
            <input type="text" v-model="claimForm.claimer_name" placeholder="您的稱呼 (例：王同學)" required />
            <input type="text" v-model="claimForm.contact_info" placeholder="聯絡電話 / Email" required />
            <textarea v-model="claimForm.claim_reason" placeholder="請輸入認領證明或約定面交說明..."></textarea>
            <button type="submit">提交認領</button>
          </form>
        </div>

        <button class="btn-close" @click="selectedItem = null">關閉</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      currentTab: 'list',
      items: [],
      filters: { type: '', category: '', search: '' },
      newItem: { type: 'lost', title: '', category: '其他', date: '', location: '', description: '' },
      selectedFile: null,   
      imagePreview: null,   
      selectedItem: null,
      claimForm: { claimer_name: '', contact_info: '', claim_reason: '' },
      backendUrl: 'http://localhost:3000/api'
    };
  },
  mounted() {
    this.fetchItems();
  },
  methods: {
    async fetchItems() {
      const { type, category, search } = this.filters;
      const query = new URLSearchParams({ type, category, search }).toString();
      try {
        const res = await fetch(`${this.backendUrl}/items?${query}`);
        this.items = await res.json();
      } catch (err) {
        console.error('無法獲取資料:', err);
      }
    },
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (file) {
        this.selectedFile = file;
        this.imagePreview = URL.createObjectURL(file); 
      }
    },
    async submitItem() {
      console.log("確認發布按鈕被點擊！目前資料：", this.newItem);
      try {
        const formData = new FormData();
        formData.append('type', this.newItem.type);
        formData.append('title', this.newItem.title);
        formData.append('category', this.newItem.category);
        formData.append('date', this.newItem.date);
        formData.append('location', this.newItem.location);
        formData.append('description', this.newItem.description);
        
        if (this.selectedFile) {
          formData.append('image', this.selectedFile); 
        }

        const res = await fetch(`${this.backendUrl}/items`, {
          method: 'POST',
          body: formData 
        });

        if (res.ok) {
          alert('發布成功！');
          this.newItem = { type: 'lost', title: '', category: '其他', date: '', location: '', description: '' };
          this.selectedFile = null;
          this.imagePreview = null;
          this.currentTab = 'list';
          this.fetchItems();
        } else {
          const errorData = await res.json();
          alert(`發布失敗，後端錯誤：${errorData.error || '未知錯誤'}`);
        }
      } catch (err) {
        console.error('傳送發布請求時發生錯誤：', err);
        alert('連線失敗，請檢查後端伺服器是否啟動！');
      }
    },
    async viewDetail(id) {
      try {
        const res = await fetch(`${this.backendUrl}/items/${id}`);
        this.selectedItem = await res.json();
      } catch (err) {
        alert('無法載入詳細資訊');
      }
    },
    async submitClaim() {
      try {
        const res = await fetch(`${this.backendUrl}/claims`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...this.claimForm, item_id: this.selectedItem.id })
        });
        if (res.ok) {
          alert('認領成功！');
          this.selectedItem = null;
          this.claimForm = { claimer_name: '', contact_info: '', claim_reason: '' };
          this.fetchItems();
        }
      } catch (err) {
        alert('提交失敗');
      }
    },
    getDefaultEmoji(category) {
      const emojis = { '電子產品': '💻', '文具書籍': '📚', '皮夾證件': '🪪' };
      return emojis[category] || '📦';
    }
  }
};
</script>

<style scoped>
.container { max-width: 900px; margin: 0 auto; padding: 20px; font-family: sans-serif; color: #333; }
.tabs { margin-bottom: 20px; }

/* 🌟 所有按鈕文字顏色均設為全黑 (#000000) 並加粗 */
.tabs button { padding: 10px 20px; font-size: 16px; margin-right: 10px; cursor: pointer; border: 1px solid #ccc; background: #fff; color: #000000; font-weight: bold; }
.tabs button.active { background: #42b983; color: #000000; border-color: #42b983; font-weight: bold; }
button { padding: 8px 12px; background: #42b983; color: #000000; font-weight: bold; border: none; border-radius: 4px; cursor: pointer; margin-top: auto; }
.btn-success { background: #2ecc71; font-size: 16px; padding: 10px; color: #000000; font-weight: bold; }
.btn-close { background: #95a5a6; margin-top: 15px; width: 100%; color: #000000; font-weight: bold; }

.filter-bar { display: flex; gap: 10px; margin-bottom: 20px; }
.filter-bar input, .filter-bar select { padding: 8px; border: 1px solid #ccc; }
.filter-bar input { flex-grow: 1; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
.card { border: 1px solid #eee; padding: 15px; border-radius: 8px; background: #fafafa; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column; }
.card.claimed { opacity: 0.6; background: #eaeaea; }
.badge { position: absolute; top: 10px; right: 10px; padding: 3px 8px; border-radius: 4px; color: white; font-size: 12px; z-index: 10; }
.badge.lost { background: #e74c3c; }
.badge.found { background: #3498db; }

.image-preview-box { width: 100%; height: 150px; background: #eef2f3; margin-bottom: 12px; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.item-img { width: 100%; height: 100%; object-fit: cover; }
.no-img-placeholder { font-size: 48px; }
.upload-preview { max-width: 200px; max-height: 150px; margin-top: 10px; border-radius: 4px; border: 1px dashed #ccc; }
.modal-image-box { width: 100%; max-height: 250px; overflow: hidden; display: flex; justify-content: center; margin-bottom: 15px; border-radius: 6px; }
.modal-img { max-width: 100%; max-height: 250px; object-fit: contain; }

.form-container form { display: flex; flex-direction: column; gap: 10px; max-width: 500px; }
.form-container input, .form-container select, .form-container textarea { padding: 8px; font-size: 14px; }

.modal-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index: 100; }
.modal { background: white; padding: 30px; border-radius: 8px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; }
.claim-box { background: #f9f9f9; padding: 15px; border: 1px dashed #ccc; margin-top: 15px; display: flex; flex-direction: column; gap: 8px; }
.claim-box input, .claim-box textarea { width: 95%; padding: 6px; margin-bottom: 5px; }
</style>