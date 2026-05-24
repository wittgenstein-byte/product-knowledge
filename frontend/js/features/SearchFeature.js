class SearchFeature {
  constructor(apiClient, navigationService, toastService) {
    this._api = apiClient;
    this._nav = navigationService;
    this._toast = toastService;
  }

  init() {
    document.getElementById('btn-do-search').addEventListener('click', () => this.search());
    document.getElementById('search-query').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.search();
    });
  }

  async search() {
    const params = {
      query: document.getElementById('search-query').value.trim(),
      category: document.getElementById('filter-category').value,
      vendor: document.getElementById('filter-vendor').value,
      max_price: document.getElementById('filter-max-price').value || undefined,
      segment: document.getElementById('filter-segment').value,
    };
    try {
      const data = await this._api.call('searchProducts', params);
      this._render(data);
    } catch (e) { this._toast.show(e.message, 'error'); }
  }

  _render(data) {
    const area = document.getElementById('search-results-area');
    if (!data.products || data.products.length === 0) {
      area.innerHTML = '<div class="empty-state"><div class="empty-icon">😕</div><p>ไม่พบสินค้าที่ตรงกับเงื่อนไข</p></div>';
      return;
    }
    const cards = data.products.map(p => {
      const eolWarn = p.eol === true || p.eol === 'TRUE'
        ? `<div class="eol-warning">⚠ สินค้านี้ End-of-Life${p.replacement_sku ? ` → Replacement: ${p.replacement_sku}` : ''}</div>`
        : '';
      return `<div class="product-card">
        <div class="pc-top">
          <div>
            <div class="pc-vendor">${p.vendor}</div>
            <div class="pc-model">${p.model}</div>
            <div class="pc-sku">${p.sku}</div>
          </div>
          ${Formatters.availabilityBadge(p.availability, p.eol)}
        </div>
        <div class="pc-desc">${p.description || ''}</div>
        ${p.key_specs ? `<div class="pc-specs">${p.key_specs}</div>` : ''}
        ${eolWarn}
        <div class="pc-footer">
          <div class="pc-price">${Formatters.price(p.price_thb)}<span>THB</span></div>
          <div class="pc-actions">
            <button class="btn-compare-add" onclick="window.__app.addToCompare('${p.sku}')">+ เปรียบเทียบ</button>
          </div>
        </div>
      </div>`;
    }).join('');
    area.innerHTML = `
      <div class="results-header">
        <span class="results-count">พบ ${data.total_found} รายการ (แสดง ${data.products.length})</span>
      </div>
      <div class="product-grid">${cards}</div>`;
  }
}
