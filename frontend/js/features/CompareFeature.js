class CompareFeature {
  constructor(stateService, apiClient, loadingService, toastService, llmService) {
    this._state = stateService;
    this._api = apiClient;
    this._loading = loadingService;
    this._toast = toastService;
    this._llm = llmService;
    this._currentProducts = [];
  }

  init() {
    document.getElementById('btn-add-compare-sku').addEventListener('click', () => this._addInput());
    document.getElementById('btn-do-compare').addEventListener('click', () => this.compare());
    document.querySelectorAll('.remove-compare-sku').forEach(b =>
      b.addEventListener('click', () => b.closest('.compare-sku-row')?.remove()));
    this._updateBadge();
  }

  add(sku) {
    const skus = this._state.get('compareSkus');
    if (skus.includes(sku)) { this._toast.show(`${sku} อยู่ในรายการแล้ว`, 'info'); return; }
    if (skus.length >= 4) { this._toast.show('เปรียบเทียบได้สูงสุด 4 รายการ', 'error'); return; }
    skus.push(sku);
    this._updateBadge();
    const empty = [...document.querySelectorAll('.compare-sku-field')].find(i => !i.value);
    if (empty) empty.value = sku;
    this._toast.show(`เพิ่ม ${sku} เข้ารายการเปรียบเทียบ`, 'success');
  }

  _updateBadge() {
    const n = this._state.get('compareSkus').length;
    const b = document.getElementById('compare-badge');
    b.textContent = n;
    b.style.display = n ? 'inline' : 'none';
  }

  async compare() {
    const skus = [...document.querySelectorAll('.compare-sku-field')].map(i => i.value.trim()).filter(Boolean);
    if (skus.length < 2) { this._toast.show('ต้องใส่อย่างน้อย 2 SKU', 'error'); return; }
    try {
      this._loading.show('กำลังดึงข้อมูลเปรียบเทียบ...');
      const [compareData, ...datasheets] = await Promise.all([
        this._api.callRaw('compareProducts', { skus }),
        ...skus.map(sku => this._api.callRaw('getDatasheet', { sku }).catch(() => ({ found: false, sku }))),
      ]);
      this._loading.hide();
      const dsMap = {};
      datasheets.forEach(ds => {
        const key = ds.sku || ds.params?.sku;
        if (key) dsMap[key] = ds.specs || {};
      });
      const products = (compareData.products || []).map(p => ({
        ...p,
        specs: { ...(dsMap[p.sku] || {}), ...(p.specs || {}) },
      }));
      this._currentProducts = products;
      this._render({ ...compareData, products });
    } catch (e) { this._loading.hide(); this._toast.show(e.message, 'error'); }
  }

  _render(data) {
    const el = document.getElementById('compare-result');
    const products = data.products || [];
    const dims = ['price_thb', 'availability', 'lead_time_weeks', 'distributor'];
    const dimLabels = {
      price_thb: 'ราคา (THB)',
      availability: 'Availability',
      lead_time_weeks: 'Lead Time (Wk)',
      distributor: 'Distributor',
    };
    const specKeys = [
      'throughput', 'ports', 'poe_budget_w', 'uplink', 'stacking',
      'power_w', 'dimensions_mm', 'warranty_years', 'management', 'certifications', 'notes',
    ];
    const specLabels = {
      throughput: 'Throughput', ports: 'Ports', poe_budget_w: 'PoE (W)',
      uplink: 'Uplink', stacking: 'Stacking', power_w: 'Power (W)',
      dimensions_mm: 'Dimensions (mm)', warranty_years: 'Warranty (Yr)',
      management: 'Management', certifications: 'Certifications', notes: 'Notes',
    };
    const headers = products.map(p =>
      `<th>${p.vendor}<br><small style="font-weight:400;color:var(--text-secondary)">${p.model || p.sku}</small></th>`).join('');
    const dimRows = dims.map(k => {
      const vals = products.map(p => p[k] ?? '-');
      return `<tr><td>${dimLabels[k]}</td>${
        vals.map(v => `<td>${k === 'price_thb' ? Formatters.price(v) : v}</td>`).join('')
      }</tr>`;
    }).join('');
    const specRows = specKeys.map(k => {
      const vals = products.map(p => (p.specs || {})[k]);
      if (vals.every(v => !v)) return '';
      return `<tr><td>${specLabels[k]}</td>${
        vals.map(v => `<td>${v ?? '-'}</td>`).join('')
      }</tr>`;
    }).filter(Boolean).join('');
    const colspan = products.length + 1;
    const techSection = specRows
      ? `<tr><td colspan="${colspan}" style="background:var(--bg-surface);font-weight:700;font-size:11px;color:var(--text-muted);text-transform:uppercase;padding:10px 16px">Technical Specs</td></tr>${specRows}`
      : `<tr><td colspan="${colspan}" style="color:var(--text-muted);font-size:12px;padding:12px 16px">ไม่มีข้อมูล Technical Specs ใน Sheets — กรุณาเพิ่มข้อมูลในชีต Datasheet</td></tr>`;
    
    el.innerHTML = `
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>รายการ</th>${headers}</tr></thead>
          <tbody>${dimRows}${techSection}</tbody>
        </table>
      </div>
      
      <div class="compare-actions-ai" style="margin-top: 20px; display: flex; justify-content: flex-end;">
        <button class="btn-primary" id="btn-compare-ai" style="background: linear-gradient(135deg, var(--accent), #8b5cf6);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 6px; vertical-align: middle;">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
            <path d="M9 15h6"/>
          </svg>
          🤖 วิเคราะห์ด้วย AI (Gemini)
        </button>
      </div>
      
      <div id="compare-ai-result-container" style="display: none; margin-top: 20px;">
        <div class="card ai-analysis-card" style="border-top: 3px solid var(--accent); background: rgba(20, 23, 32, 0.45); backdrop-filter: blur(8px);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;">🤖</span>
              <h3 style="font-size: 14px; font-weight: 700; color: var(--accent-light);">รายงานการวิเคราะห์เปรียบเทียบเชิงวิชาชีพโดย AI</h3>
            </div>
            <span style="font-size: 10px; font-weight: 600; color: var(--text-muted); background: var(--bg-input); padding: 3px 8px; border-radius: 99px; border: 1px solid var(--border); text-transform: uppercase;">AI Analyst</span>
          </div>
          <div id="compare-ai-content" class="ai-content-body" style="font-size: 13px; color: var(--text-primary);">
            <!-- markdown parsed contents -->
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-compare-ai').addEventListener('click', () => this.analyzeWithAi());
  }

  async analyzeWithAi() {
    if (!this._llm.isConfigured()) {
      this._toast.show('กรุณาตั้งค่า URL และ API Key ของ LLM ในหน้าตั้งค่าก่อน', 'error');
      return;
    }
    if (this._currentProducts.length === 0) return;

    try {
      const systemPrompt = this._llm.buildCompareSystemPrompt();
      const userPrompt = this._llm.buildStandardComparePrompt(this._currentProducts);
      
      const response = await this._llm.query(systemPrompt, userPrompt);
      const container = document.getElementById('compare-ai-result-container');
      const contentEl = document.getElementById('compare-ai-content');
      
      contentEl.innerHTML = Formatters.markdown(response);
      container.style.display = 'block';
      
      container.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      this._toast.show('การวิเคราะห์ด้วย AI ล้มเหลว: ' + e.message, 'error');
    }
  }

  _addInput() {
    const list = document.getElementById('compare-sku-inputs');
    if (list.children.length >= 4) { this._toast.show('สูงสุด 4 SKU', 'error'); return; }
    const row = document.createElement('div');
    row.className = 'compare-sku-row';
    const idx = list.children.length + 1;
    row.innerHTML = `<input type="text" class="filter-input compare-sku-field" placeholder="SKU ${idx}" /><button class="btn-icon remove-compare-sku" title="ลบ">✕</button>`;
    row.querySelector('.remove-compare-sku').onclick = () => row.remove();
    list.appendChild(row);
  }
}
