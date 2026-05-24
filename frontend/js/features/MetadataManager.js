class MetadataManager {
  constructor(stateService, apiClient, loadingService, toastService) {
    this._state = stateService;
    this._api = apiClient;
    this._loading = loadingService;
    this._toast = toastService;
  }

  init() {
    document.getElementById('btn-refresh-data')?.addEventListener('click', () => this.load(false));
  }

  async load(silent = true) {
    if (!this._state.get('apiUrl')) return;
    try {
      if (!silent) this._loading.show('กำลัง Sync ข้อมูลจาก Sheets...');
      const data = await this._api.call('getMetadata', {}, { silent });
      this._state.set('metadata', data);
      this._populateFilters(data);
      this._updateSyncBadge(data);
      if (!silent) this._toast.show(`Sync สำเร็จ — ${data.product_count} สินค้า (${data.synced_at})`, 'success');
    } catch (e) {
      if (!silent) this._toast.show('Sync ล้มเหลว: ' + e.message, 'error');
    }
  }

  _populateFilters(data) {
    const maps = [
      { id: 'filter-category', items: data.categories, label: 'ทุก Category' },
      { id: 'filter-vendor', items: data.vendors, label: 'ทุก Vendor' },
      { id: 'filter-segment', items: data.segments, label: 'ทุก Segment' },
    ];
    maps.forEach(({ id, items, label }) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const current = sel.value;
      sel.innerHTML = `<option value="">${label}</option>${
        items.map(v => `<option value="${v}"${v === current ? ' selected' : ''}>${v}</option>`).join('')
      }`;
    });
  }

  _updateSyncBadge(data) {
    const el = document.getElementById('sync-status');
    if (el) {
      el.innerHTML = `<span class="sync-dot">●</span><span>${data.product_count} สินค้า · Sync ${data.synced_at}</span>`;
      el.classList.add('synced');
    }
    const statsEl = document.getElementById('meta-stats');
    if (!statsEl) return;
    document.getElementById('stat-val-products').textContent = data.product_count;
    document.getElementById('stat-val-categories').textContent = data.categories.length;
    document.getElementById('stat-val-vendors').textContent = data.vendors.length;
    document.getElementById('stat-val-synced').textContent = data.synced_at.split(' ')[1] || data.synced_at;
    statsEl.style.display = 'grid';
    statsEl.querySelectorAll('.meta-stat-card').forEach((c, i) => {
      c.style.animationDelay = `${i * 60}ms`;
      c.classList.add('stat-pop');
    });
  }
}
