export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

export const statusLabel = (s) =>
  ({ active: '待認領', claimed: '已認領', closed: '已結案', deleted: '已刪除' }[s] || s)

export const defaultEmoji = (cat) =>
  ({ '電子產品': '💻', '文具書籍': '📚', '皮夾證件': '🪪' }[cat] || '📦')
