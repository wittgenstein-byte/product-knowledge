class NavigationService {
  constructor() {
    this._labels = {
      search: 'ค้นหาสินค้า',
      datasheet: 'Datasheet',
      compare: 'เปรียบเทียบ',
      'ai-compare': 'AI เปรียบเทียบ',
      pricing: 'ตรวจราคา',
      settings: 'ตั้งค่า API',
    };
  }

  navigate(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`page-${page}`)?.classList.add('active');
    document.getElementById(`nav-${page}`)?.classList.add('active');
    document.getElementById('breadcrumb-current').textContent = this._labels[page] || page;
  }
}
