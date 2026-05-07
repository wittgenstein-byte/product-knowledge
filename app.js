// ── STATE ──────────────────────────────────────────
const state = {
  apiUrl: localStorage.getItem('si_api_url') || '',
  userName: localStorage.getItem('si_user_name') || 'Sales',
  userRole: localStorage.getItem('si_user_role') || 'sales',
  compareSkus: [],
  theme: localStorage.getItem('si_theme') || 'dark',
  metadata: null,       // cached metadata from Sheets
  metadata: null,       // cached metadata from Sheets
};

// ── THEME ──────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const moon = document.getElementById('icon-moon');
  const sun = document.getElementById('icon-sun');
  if (moon) moon.style.display = theme === 'light' ? 'none' : 'block';
  if (sun) sun.style.display = theme === 'light' ? 'block' : 'none';
  localStorage.setItem('si_theme', theme);
  state.theme = theme;
}
function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

// ── API CALL ───────────────────────────────────────
async function callApi(action, params) {
  if (!state.apiUrl) { showToast('กรุณาตั้งค่า API URL ก่อน', 'error'); navigate('settings'); throw new Error('No API URL'); }
  showLoading(`กำลังเรียก ${action}...`);
  try {
    // Apps Script requires text/plain to avoid CORS preflight (OPTIONS) rejection.
    // redirect:'follow' is needed because Apps Script 302-redirects POST to googleusercontent.com
    // Apps Script requires text/plain to avoid CORS preflight (OPTIONS) rejection.
    // redirect:'follow' is needed because Apps Script 302-redirects POST to googleusercontent.com
    const res = await fetch(state.apiUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, params }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  } finally { hideLoading(); }
}

// ── NAVIGATION ─────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  document.getElementById('nav-' + page)?.classList.add('active');
  const labels = { search: 'ค้นหาสินค้า', datasheet: 'Datasheet', compare: 'เปรียบเทียบ', bom: 'สร้าง BOM', proposal: 'Proposal', pricing: 'ตรวจราคา', settings: 'ตั้งค่า API' };
  document.getElementById('breadcrumb-current').textContent = labels[page] || page;
}

// ── TOAST ──────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3500) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

// ── LOADING ────────────────────────────────────────
function showLoading(text = 'กำลังโหลด...') {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('loading-overlay').style.display = 'flex';
}
function hideLoading() { document.getElementById('loading-overlay').style.display = 'none'; }

// ── METADATA / REFRESH ─────────────────────────────
async function loadMetadata(silent = false) {
  if (!state.apiUrl) return;
  try {
    if (!silent) showLoading('กำลัง Sync ข้อมูลจาก Sheets...');
    const data = await callApi('getMetadata', {});
    state.metadata = data;
    populateFilterDropdowns(data);
    updateSyncBadge(data);
    if (!silent) showToast(`Sync สำเร็จ — ${data.product_count} สินค้า (${data.synced_at})`, 'success');
  } catch (e) {
    if (!silent) showToast('Sync ล้มเหลว: ' + e.message, 'error');
  }
}

function populateFilterDropdowns(data) {
  // Rebuild each select, keeping the first "ทั้งหมด" option
  const maps = [
    { id: 'filter-category', items: data.categories, label: 'ทุก Category' },
    { id: 'filter-vendor', items: data.vendors, label: 'ทุก Vendor' },
    { id: 'filter-segment', items: data.segments, label: 'ทุก Segment' },
  ];
  maps.forEach(({ id, items, label }) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = `<option value="">${label}</option>` +
      items.map(v => `<option value="${v}"${v === current ? ' selected' : ''}>${v}</option>`).join('');
  });
}

function updateSyncBadge(data) {
  const el = document.getElementById('sync-status');
  if (!el) return;
  el.innerHTML = `
    <span class="sync-dot">●</span>
    <span>${data.product_count} สินค้า · Sync ${data.synced_at}</span>`;
  el.classList.add('synced');
}

// ── METADATA / REFRESH ─────────────────────────────
async function loadMetadata(silent = false) {
  if (!state.apiUrl) return;
  try {
    if (!silent) showLoading('กำลัง Sync ข้อมูลจาก Sheets...');
    const data = await callApi('getMetadata', {});
    state.metadata = data;
    populateFilterDropdowns(data);
    updateSyncBadge(data);
    if (!silent) showToast(`Sync สำเร็จ — ${data.product_count} สินค้า (${data.synced_at})`, 'success');
  } catch (e) {
    if (!silent) showToast('Sync ล้มเหลว: ' + e.message, 'error');
  }
}

function populateFilterDropdowns(data) {
  // Rebuild each select, keeping the first "ทั้งหมด" option
  const maps = [
    { id: 'filter-category', items: data.categories, label: 'ทุก Category' },
    { id: 'filter-vendor', items: data.vendors, label: 'ทุก Vendor' },
    { id: 'filter-segment', items: data.segments, label: 'ทุก Segment' },
  ];
  maps.forEach(({ id, items, label }) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = `<option value="">${label}</option>` +
      items.map(v => `<option value="${v}"${v === current ? ' selected' : ''}>${v}</option>`).join('');
  });
}

function updateSyncBadge(data) {
  // Sync status bar
  const el = document.getElementById('sync-status');
  if (el) {
    el.innerHTML = `
      <span class="sync-dot">●</span>
      <span>${data.product_count} สินค้า · Sync ${data.synced_at}</span>`;
    el.classList.add('synced');
  }

  // Stats cards — reveal & fill
  const statsEl = document.getElementById('meta-stats');
  if (statsEl) {
    document.getElementById('stat-val-products').textContent = data.product_count;
    document.getElementById('stat-val-categories').textContent = data.categories.length;
    document.getElementById('stat-val-vendors').textContent = data.vendors.length;
    document.getElementById('stat-val-synced').textContent = data.synced_at.split(' ')[1] || data.synced_at;
    statsEl.style.display = 'grid';
    // Animate each card
    statsEl.querySelectorAll('.meta-stat-card').forEach((c, i) => {
      c.style.animationDelay = `${i * 60}ms`;
      c.classList.add('stat-pop');
    });
  }
}

// ── FORMAT ─────────────────────────────────────────
function fmt(n) { return Number(n).toLocaleString('th-TH'); }
function availBadge(av, eol) {
  if (eol === true || eol === 'TRUE') return `<span class="availability-badge badge-eol">⚠ EoL</span>`;
  if (av === 'In Stock') return `<span class="availability-badge badge-instock">In Stock</span>`;
  return `<span class="availability-badge badge-leadtime">${av || 'Lead Time'}</span>`;
}

// ── SEARCH ─────────────────────────────────────────
async function doSearch() {
  const params = {
    query: document.getElementById('search-query').value.trim(),
    category: document.getElementById('filter-category').value,
    vendor: document.getElementById('filter-vendor').value,
    max_price: document.getElementById('filter-max-price').value || undefined,
    segment: document.getElementById('filter-segment').value,
  };
  try {
    const data = await callApi('searchProducts', params);
    renderSearchResults(data);
  } catch (e) { showToast(e.message, 'error'); }
}

function renderSearchResults(data) {
  const area = document.getElementById('search-results-area');
  if (!data.products || data.products.length === 0) {
    area.innerHTML = `<div class="empty-state"><div class="empty-icon">😕</div><p>ไม่พบสินค้าที่ตรงกับเงื่อนไข</p></div>`;
    return;
  }
  const cards = data.products.map(p => `
    <div class="product-card">
      <div class="pc-top">
        <div>
          <div class="pc-vendor">${p.vendor}</div>
          <div class="pc-model">${p.model}</div>
          <div class="pc-sku">${p.sku}</div>
        </div>
        ${availBadge(p.availability, p.eol)}
      </div>
      <div class="pc-desc">${p.description || ''}</div>
      ${p.key_specs ? `<div class="pc-specs">${p.key_specs}</div>` : ''}
      ${p.eol === true || p.eol === 'TRUE' ? `<div class="eol-warning">⚠ สินค้านี้ End-of-Life${p.replacement_sku ? ` → Replacement: ${p.replacement_sku}` : ''}</div>` : ''}
      <div class="pc-footer">
        <div class="pc-price">${fmt(p.price_thb)}<span>THB</span></div>
        <div class="pc-actions">
          <button class="btn-compare-add" onclick="addToCompare('${p.sku}')">+ เปรียบเทียบ</button>
        </div>
      </div>
    </div>`).join('');
  area.innerHTML = `
    <div class="results-header">
      <span class="results-count">พบ ${data.total_found} รายการ (แสดง ${data.products.length})</span>
    </div>
    <div class="product-grid">${cards}</div>`;
}

// ── DATASHEET ──────────────────────────────────────
async function getDatasheet() {
  const sku = document.getElementById('ds-sku').value.trim();
  const model = document.getElementById('ds-model').value.trim();
  const vendor = document.getElementById('ds-vendor').value.trim();
  if (!sku && !model) { showToast('กรุณาใส่ SKU หรือ Model', 'error'); return; }
  const params = sku ? { sku } : { model, vendor };
  try {
    const data = await callApi('getDatasheet', params);
    renderDatasheet(data);
  } catch (e) { showToast(e.message, 'error'); }
}

function renderDatasheet(d) {
  const el = document.getElementById('datasheet-result');
  if (!d.found) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>${d.message || 'ไม่พบ Datasheet'}</p></div>`;
    return;
  }
  const specs = d.specs || {};
  const rows = [
    ['Throughput', specs.throughput], ['Ports', specs.ports],
    ['PoE Budget (W)', specs.poe_budget_w], ['Uplink', specs.uplink],
    ['Stacking', specs.stacking], ['Power (W)', specs.power_w],
    ['Dimensions (mm)', specs.dimensions_mm], ['Warranty', specs.warranty_years ? specs.warranty_years + ' years' : null],
    ['Management', specs.management], ['Certifications', specs.certifications],
    ['Notes', specs.notes],
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

// ── COMPARE ────────────────────────────────────────
function addToCompare(sku) {
  if (state.compareSkus.includes(sku)) { showToast(`${sku} อยู่ในรายการแล้ว`, 'info'); return; }
  if (state.compareSkus.length >= 4) { showToast('เปรียบเทียบได้สูงสุด 4 รายการ', 'error'); return; }
  state.compareSkus.push(sku);
  updateCompareBadge();
  // Fill compare inputs
  const inputs = document.querySelectorAll('.compare-sku-field');
  const empty = [...inputs].find(i => !i.value);
  if (empty) empty.value = sku;
  showToast(`เพิ่ม ${sku} เข้ารายการเปรียบเทียบ`, 'success');
}
function updateCompareBadge() {
  const b = document.getElementById('compare-badge');
  b.textContent = state.compareSkus.length;
  b.style.display = state.compareSkus.length ? 'inline' : 'none';
}

async function doCompare() {
  const skus = [...document.querySelectorAll('.compare-sku-field')]
    .map(i => i.value.trim()).filter(Boolean);
  if (skus.length < 2) { showToast('ต้องใส่อย่างน้อย 2 SKU', 'error'); return; }
  try {
    const data = await callApi('compareProducts', { skus });
    renderCompare(data);
  } catch (e) { showToast(e.message, 'error'); }
}

function renderCompare(data) {
  const el = document.getElementById('compare-result');
  const products = data.products || [];
  const dims = ['price_thb', 'availability', 'lead_time_weeks', 'distributor'];
  const dimLabels = { price_thb: 'ราคา (THB)', availability: 'Availability', lead_time_weeks: 'Lead Time (Wk)', distributor: 'Distributor' };
  const specKeys = ['throughput', 'ports', 'poe_budget_w', 'uplink', 'stacking', 'warranty_years'];
  const specLabels = { throughput: 'Throughput', ports: 'Ports', poe_budget_w: 'PoE (W)', uplink: 'Uplink', stacking: 'Stacking', warranty_years: 'Warranty (Yr)' };

  const headers = products.map(p => `<th>${p.vendor}<br><small style="font-weight:400;color:var(--text-secondary)">${p.model || p.sku}</small></th>`).join('');
  const dimRows = dims.map(k => {
    const vals = products.map(p => p[k] ?? '-');
    const cells = vals.map(v => `<td>${k === 'price_thb' ? fmt(v) : v}</td>`).join('');
    return `<tr><td>${dimLabels[k]}</td>${cells}</tr>`;
  }).join('');
  const specRows = specKeys.map(k => {
    const cells = products.map(p => `<td>${(p.specs || {})[k] ?? '-'}</td>`).join('');
    return `<tr><td>${specLabels[k]}</td>${cells}</tr>`;
  }).join('');

  el.innerHTML = `<div class="compare-table-wrap"><table class="compare-table">
    <thead><tr><th>รายการ</th>${headers}</tr></thead>
    <tbody>${dimRows}<tr><td colspan="${products.length + 1}" style="background:var(--bg-surface);font-weight:700;font-size:11px;color:var(--text-muted);text-transform:uppercase">Technical Specs</td></tr>${specRows}</tbody>
  </table></div>`;
}

function addCompareSku() {
  const list = document.getElementById('compare-sku-inputs');
  if (list.children.length >= 4) { showToast('สูงสุด 4 SKU', 'error'); return; }
  const row = document.createElement('div');
  row.className = 'compare-sku-row';
  row.innerHTML = `<input type="text" class="filter-input compare-sku-field" placeholder="SKU ${list.children.length + 1}" /><button class="btn-icon remove-compare-sku" title="ลบ">✕</button>`;
  row.querySelector('.remove-compare-sku').onclick = () => row.remove();
  list.appendChild(row);
}

// ── BOM ────────────────────────────────────────────
function addBomItem() {
  const list = document.getElementById('bom-items-list');
  const row = document.createElement('div');
  row.className = 'bom-item-row';
  row.innerHTML = `<input type="text" class="form-input bom-sku" placeholder="SKU" /><input type="number" class="form-input bom-qty" placeholder="จำนวน" min="1" value="1" /><input type="text" class="form-input bom-notes" placeholder="หมายเหตุ" /><button class="btn-icon remove-bom-item">✕</button>`;
  row.querySelector('.remove-bom-item').onclick = () => row.remove();
  list.appendChild(row);
}

function addBomService() {
  const list = document.getElementById('bom-services-list');
  const row = document.createElement('div');
  row.className = 'bom-service-row';
  row.innerHTML = `<input type="text" class="form-input" placeholder="รายละเอียดบริการ" style="flex:3" /><input type="text" class="form-input" placeholder="หน่วย" style="flex:1" /><input type="number" class="form-input" placeholder="จำนวน" value="1" style="flex:1" /><input type="number" class="form-input" placeholder="ราคาต่อหน่วย" style="flex:1.5" /><button class="btn-icon remove-bom-item">✕</button>`;
  row.querySelector('.remove-bom-item').onclick = () => row.remove();
  list.appendChild(row);
}

async function generateBOM() {
  const project_name = document.getElementById('bom-project').value.trim();
  const customer_name = document.getElementById('bom-customer').value.trim();
  const prepared_by = document.getElementById('bom-prepared-by').value.trim();
  if (!project_name || !customer_name || !prepared_by) { showToast('กรุณากรอกข้อมูลโปรเจกต์ให้ครบ', 'error'); return; }
  const items = [...document.querySelectorAll('.bom-item-row')].map(row => ({
    sku: row.querySelector('.bom-sku').value.trim(),
    qty: Number(row.querySelector('.bom-qty').value) || 1,
    notes: row.querySelector('.bom-notes').value.trim(),
  })).filter(i => i.sku);
  if (items.length === 0) { showToast('กรุณาใส่อย่างน้อย 1 รายการ', 'error'); return; }
  const serviceRows = [...document.querySelectorAll('.bom-service-row')];
  const services = serviceRows.map(row => {
    const ins = row.querySelectorAll('input');
    return { description: ins[0].value, unit: ins[1].value, qty: Number(ins[2].value), unit_price: Number(ins[3].value) };
  }).filter(s => s.description);
  try {
    const data = await callApi('generateBOM', { project_name, customer_name, prepared_by, items, services });
    renderBOMResult(data);
    showToast(`สร้าง BOM ${data.bom_id} เรียบร้อย`, 'success');
    document.getElementById('prop-bom-id').value = data.bom_id;
  } catch (e) { showToast(e.message, 'error'); }
}

function renderBOMResult(d) {
  const panel = document.getElementById('bom-result');
  const lineRows = (d.lines || []).map(l => l.error
    ? `<tr><td>${l.line}</td><td>${l.sku}</td><td colspan="4" style="color:var(--danger)">${l.error}</td></tr>`
    : `<tr><td>${l.line}</td><td style="font-family:monospace;font-size:11px">${l.sku}</td><td>${l.model || ''}</td><td>${l.qty}</td><td>${fmt(l.unit_price_thb)}</td><td>${fmt(l.total_price_thb)}</td></tr>`
  ).join('');
  panel.innerHTML = `<div class="bom-result-inner">
    <div class="bom-id-badge">${d.bom_id}</div>
    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px">${d.project_name} — ${d.customer_name}</div>
    <div class="bom-summary-grid">
      <div class="bom-summary-card"><div class="bom-summary-label">Hardware</div><div class="bom-summary-value">${fmt(d.summary?.hardware_total_thb)}</div></div>
      <div class="bom-summary-card"><div class="bom-summary-label">Services</div><div class="bom-summary-value">${fmt(d.summary?.services_total_thb)}</div></div>
      <div class="bom-summary-card"><div class="bom-summary-label">Grand Total</div><div class="bom-summary-value grand">${fmt(d.summary?.grand_total_thb)} THB</div></div>
    </div>
    <table class="bom-line-table"><thead><tr><th>#</th><th>SKU</th><th>Model</th><th>Qty</th><th>Unit (THB)</th><th>Total (THB)</th></tr></thead><tbody>${lineRows}</tbody></table>
    <p style="font-size:11px;color:var(--text-muted);margin-top:12px">อายุใบเสนอราคา: 30 วัน | วันที่: ${d.date}</p>
  </div>`;
}

// ── PROPOSAL ───────────────────────────────────────
async function saveProposal() {
  const params = {
    customer_name: document.getElementById('prop-customer').value.trim(),
    project_name: document.getElementById('prop-project').value.trim(),
    prepared_by: document.getElementById('prop-prepared-by').value.trim(),
    bom_id: document.getElementById('prop-bom-id').value.trim(),
    sections: {
      executive_summary: document.getElementById('prop-exec-summary').value,
      understanding: document.getElementById('prop-understanding').value,
      solution: document.getElementById('prop-solution').value,
      recommendation: document.getElementById('prop-recommendation').value,
      next_steps: document.getElementById('prop-next-steps').value,
    },
  };
  if (!params.customer_name || !params.project_name || !params.prepared_by) { showToast('กรุณากรอกข้อมูลให้ครบ', 'error'); return; }
  try {
    const data = await callApi('saveProposal', params);
    document.getElementById('proposal-result').innerHTML = `<div class="card" style="border-color:var(--success)">
      <div style="color:var(--success);font-size:20px;margin-bottom:8px">✓ บันทึกสำเร็จ</div>
      <div style="font-family:monospace;font-size:13px">Proposal ID: <strong>${data.proposal_id}</strong></div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:6px">${data.message}</div>
    </div>`;
    showToast(`บันทึก ${data.proposal_id} สำเร็จ`, 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

// ── PRICING ────────────────────────────────────────
async function getPricing() {
  const raw = document.getElementById('pricing-skus').value.trim();
  const skus = raw.split('\n').map(s => s.trim()).filter(Boolean);
  if (skus.length === 0) { showToast('กรุณาใส่ SKU อย่างน้อย 1 รายการ', 'error'); return; }
  try {
    const data = await callApi('getPricing', { skus });
    renderPricing(data.pricing || []);
  } catch (e) { showToast(e.message, 'error'); }
}

function renderPricing(pricing) {
  const el = document.getElementById('pricing-result');
  if (pricing.length === 0) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>ไม่พบข้อมูลราคา</p></div>`; return; }
  const rows = pricing.map(p => p.found
    ? `<tr><td><span class="sku-mono">${p.sku}</span></td><td>${p.model || '-'}</td><td><span class="price-value">${fmt(p.price_thb)}</span></td><td>${availBadge(p.availability)}</td><td style="font-size:11px;color:var(--text-muted)">${p.last_updated || '-'}</td></tr>`
    : `<tr><td><span class="sku-mono">${p.sku}</span></td><td colspan="4" style="color:var(--danger)">ไม่พบ SKU นี้</td></tr>`
  ).join('');
  el.innerHTML = `<div class="card" style="padding:0;overflow:hidden"><table class="pricing-table">
    <thead><tr><th>SKU</th><th>Model</th><th>ราคา (THB)</th><th>Availability</th><th>อัพเดท</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

// ── SETTINGS ───────────────────────────────────────
function loadSettings() {
  document.getElementById('settings-api-url').value = state.apiUrl;
  document.getElementById('settings-user-name').value = state.userName;
  document.getElementById('settings-user-role').value = state.userRole;
}

function saveSettings() {
  state.apiUrl = document.getElementById('settings-api-url').value.trim();
  state.userName = document.getElementById('settings-user-name').value.trim() || 'Sales';
  state.userRole = document.getElementById('settings-user-role').value;
  localStorage.setItem('si_api_url', state.apiUrl);
  localStorage.setItem('si_user_name', state.userName);
  localStorage.setItem('si_user_role', state.userRole);
  updateUserDisplay();
  showToast('บันทึกการตั้งค่าเรียบร้อย', 'success');
  // Reload metadata from Sheets with new URL
  loadMetadata(false);
  // Reload metadata from Sheets with new URL
  loadMetadata(false);
}

function updateUserDisplay() {
  document.getElementById('user-name-display').textContent = state.userName;
  document.getElementById('user-avatar-display').textContent = state.userName.charAt(0).toUpperCase();
  const dot = document.getElementById('api-status').querySelector('.status-dot');
  const txt = document.getElementById('api-status-text');
  if (state.apiUrl) {
    dot.className = 'status-dot connected';
    txt.textContent = 'เชื่อมต่อแล้ว';
  } else {
    dot.className = 'status-dot unconfigured';
    txt.textContent = 'ยังไม่ได้ตั้งค่า API';
  }
}

async function testApi() {
  const url = document.getElementById('settings-api-url').value.trim();
  if (!url) { showToast('กรุณาใส่ URL ก่อน', 'error'); return; }
  const res = document.getElementById('api-test-result');
  res.style.display = 'block';
  res.className = 'api-test-result';
  res.textContent = 'กำลังทดสอบ...';
  try {
    const r = await fetch(url, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'searchProducts', params: { query: 'test' } }) });
    const r = await fetch(url, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'searchProducts', params: { query: 'test' } }) });
    const d = await r.json();
    res.className = 'api-test-result success';
    res.textContent = '✓ เชื่อมต่อสำเร็จ — Apps Script ตอบสนองปกติ';
  } catch (e) {
    res.className = 'api-test-result error';
    res.textContent = '✕ เชื่อมต่อไม่ได้: ' + e.message;
  }
}

// ── INIT ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Theme
  applyTheme(state.theme);
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  // Nav
  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  // Menu toggle (mobile)
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Search
  document.getElementById('btn-do-search').addEventListener('click', doSearch);
  document.getElementById('search-query').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

  // Datasheet
  document.getElementById('btn-get-datasheet').addEventListener('click', getDatasheet);

  // Compare
  document.getElementById('btn-add-compare-sku').addEventListener('click', addCompareSku);
  document.getElementById('btn-do-compare').addEventListener('click', doCompare);
  document.querySelectorAll('.remove-compare-sku').forEach(b => b.addEventListener('click', () => b.closest('.compare-sku-row').remove()));

  // BOM
  document.getElementById('btn-add-bom-item').addEventListener('click', addBomItem);
  document.getElementById('btn-add-bom-service').addEventListener('click', addBomService);
  document.getElementById('btn-generate-bom').addEventListener('click', generateBOM);
  document.querySelector('.remove-bom-item')?.addEventListener('click', function () { this.closest('.bom-item-row')?.remove(); });

  // Proposal
  document.getElementById('btn-save-proposal').addEventListener('click', saveProposal);

  // Pricing
  document.getElementById('btn-get-pricing').addEventListener('click', getPricing);

  // Settings
  document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
  document.getElementById('btn-test-api').addEventListener('click', testApi);
  document.getElementById('btn-refresh-data')?.addEventListener('click', () => loadMetadata(false));
  document.getElementById('btn-refresh-data')?.addEventListener('click', () => loadMetadata(false));

  // Init
  loadSettings();
  updateUserDisplay();

  // Auto-fill prepared_by
  document.getElementById('bom-prepared-by').value = state.userName;
  document.getElementById('prop-prepared-by').value = state.userName;

  // Silently load metadata if API already configured
  loadMetadata(true);

  // Silently load metadata if API already configured
  loadMetadata(true);
});
