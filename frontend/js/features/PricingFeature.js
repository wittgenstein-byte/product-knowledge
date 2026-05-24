class PricingFeature {
  constructor(apiClient, toastService) {
    this._api = apiClient;
    this._toast = toastService;
  }

  init() {
    document.getElementById('btn-get-pricing').addEventListener('click', () => this.get());
  }

  async get() {
    const raw = document.getElementById('pricing-skus').value.trim();
    const skus = raw.split('\n').map(s => s.trim()).filter(Boolean);
    if (skus.length === 0) { this._toast.show('กรุณาใส่ SKU อย่างน้อย 1 รายการ', 'error'); return; }
    try {
      const data = await this._api.call('getPricing', { skus });
      this._render(data.pricing || []);
    } catch (e) { this._toast.show(e.message, 'error'); }
  }

  _render(pricing) {
    const el = document.getElementById('pricing-result');
    if (pricing.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><p>ไม่พบข้อมูลราคา</p></div>';
      return;
    }
    const rows = pricing.map(p =>
      p.found
        ? `<tr><td><span class="sku-mono">${p.sku}</span></td><td>${p.model || '-'}</td><td><span class="price-value">${Formatters.price(p.price_thb)}</span></td><td>${Formatters.availabilityBadge(p.availability)}</td><td style="font-size:11px;color:var(--text-muted)">${p.last_updated || '-'}</td></tr>`
        : `<tr><td><span class="sku-mono">${p.sku}</span></td><td colspan="4" style="color:var(--danger)">ไม่พบ SKU นี้</td></tr>`
    ).join('');
    el.innerHTML = `<div class="card" style="padding:0;overflow:hidden"><table class="pricing-table">
      <thead><tr><th>SKU</th><th>Model</th><th>ราคา (THB)</th><th>Availability</th><th>อัพเดท</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }
}
