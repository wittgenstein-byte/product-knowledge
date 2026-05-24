class DatasheetFeature {
  constructor(apiClient, toastService) {
    this._api = apiClient;
    this._toast = toastService;
  }

  init() {
    document.getElementById('btn-get-datasheet').addEventListener('click', () => this.get());
  }

  async get() {
    const sku = document.getElementById('ds-sku').value.trim();
    const model = document.getElementById('ds-model').value.trim();
    const vendor = document.getElementById('ds-vendor').value.trim();
    if (!sku && !model) { this._toast.show('กรุณาใส่ SKU หรือ Model', 'error'); return; }
    try {
      const data = await this._api.call('getDatasheet', sku ? { sku } : { model, vendor });
      this._render(data);
    } catch (e) { this._toast.show(e.message, 'error'); }
  }

  _render(d) {
    const el = document.getElementById('datasheet-result');
    if (!d.found) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>${d.message || 'ไม่พบ Datasheet'}</p></div>`;
      return;
    }
    const s = d.specs || {};
    const rows = [
      ['Throughput', s.throughput],
      ['Ports', s.ports],
      ['PoE Budget (W)', s.poe_budget_w],
      ['Uplink', s.uplink],
      ['Stacking', s.stacking],
      ['Power (W)', s.power_w],
      ['Dimensions (mm)', s.dimensions_mm],
      ['Warranty', s.warranty_years ? `${s.warranty_years} years` : null],
      ['Management', s.management],
      ['Certifications', s.certifications],
      ['Notes', s.notes],
    ].filter(r => r[1]).map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
    el.innerHTML = `<div class="datasheet-panel">
      <div class="ds-header">
        <div class="pc-vendor">${d.vendor}</div>
        <div class="ds-model">${d.model}</div>
        <div class="ds-meta">
          <span>SKU: ${d.sku}</span>
          ${d.datasheet_date ? `<span>Updated: ${d.datasheet_date}</span>` : ''}
        </div>
      </div>
      <div class="ds-body">
        <table class="spec-table"><tbody>${rows}</tbody></table>
        ${d.datasheet_url ? `<a class="ds-link" href="${d.datasheet_url}" target="_blank">🔗 ดู Datasheet PDF</a>` : ''}
      </div>
    </div>`;
  }
}
