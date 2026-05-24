class AiCompareFeature {
  constructor(stateService, apiClient, loadingService, toastService, llmService) {
    this._state = stateService;
    this._api = apiClient;
    this._loading = loadingService;
    this._toast = toastService;
    this._llm = llmService;

    this._inputMode = 'sku'; // 'sku' or 'file'
    this._uploadedFiles = []; // Array of { name, size, type, content }
  }

  init() {
    this._initEventListeners();
    this._updateUiState();
  }

  _initEventListeners() {
    // Mode Switchers
    document.getElementById('ai-mode-sku')?.addEventListener('click', () => {
      this._inputMode = 'sku';
      this._updateUiState();
    });
    document.getElementById('ai-mode-file')?.addEventListener('click', () => {
      this._inputMode = 'file';
      this._updateUiState();
    });

    // SKU add/remove buttons
    document.getElementById('btn-ai-add-sku')?.addEventListener('click', () => this._addSkuRow());
    document.getElementById('btn-ai-clear-skus')?.addEventListener('click', () => this._clearSkus());

    // File Upload handling
    const dropzone = document.getElementById('ai-file-dropzone');
    const fileInput = document.getElementById('ai-file-input');

    dropzone?.addEventListener('click', () => fileInput?.click());
    
    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone?.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files) {
        this._handleFiles(e.dataTransfer.files);
      }
    });

    fileInput?.addEventListener('change', (e) => {
      if (e.target.files) {
        this._handleFiles(e.target.files);
      }
    });

    // Preset Prompt Dropdown toggle
    document.getElementById('ai-preset-select')?.addEventListener('change', (e) => {
      const isCustom = e.target.value === 'custom';
      const wrapper = document.getElementById('ai-custom-prompt-wrapper');
      if (wrapper) wrapper.style.display = isCustom ? 'block' : 'none';
    });

    // Submit button
    document.getElementById('btn-ai-submit')?.addEventListener('click', () => this.analyze());
  }

  _updateUiState() {
    const skuTab = document.getElementById('ai-mode-sku');
    const fileTab = document.getElementById('ai-mode-file');
    const skuPanel = document.getElementById('ai-panel-sku');
    const filePanel = document.getElementById('ai-panel-file');

    if (this._inputMode === 'sku') {
      skuTab?.classList.add('active');
      fileTab?.classList.remove('active');
      if (skuPanel) skuPanel.style.display = 'block';
      if (filePanel) filePanel.style.display = 'none';
    } else {
      skuTab?.classList.remove('active');
      fileTab?.classList.add('active');
      if (skuPanel) skuPanel.style.display = 'none';
      if (filePanel) filePanel.style.display = 'block';
    }
  }

  _addSkuRow() {
    const container = document.getElementById('ai-sku-inputs-container');
    if (!container) return;
    if (container.children.length >= 4) {
      this._toast.show('เปรียบเทียบได้สูงสุด 4 SKU', 'error');
      return;
    }
    const idx = container.children.length + 1;
    const row = document.createElement('div');
    row.className = 'compare-sku-row';
    row.innerHTML = `
      <input type="text" class="filter-input compare-sku-field" placeholder="SKU ${idx}" style="flex:1;" />
      <button class="btn-icon remove-compare-sku" title="ลบ">✕</button>
    `;
    row.querySelector('.remove-compare-sku').addEventListener('click', () => row.remove());
    container.appendChild(row);
  }

  _clearSkus() {
    const container = document.getElementById('ai-sku-inputs-container');
    if (container) {
      container.innerHTML = `
        <div class="compare-sku-row">
          <input type="text" class="filter-input compare-sku-field" placeholder="SKU 1" style="flex:1;" />
        </div>
        <div class="compare-sku-row">
          <input type="text" class="filter-input compare-sku-field" placeholder="SKU 2" style="flex:1;" />
        </div>
      `;
    }
  }

  async _handleFiles(files) {
    if (this._uploadedFiles.length + files.length > 4) {
      this._toast.show('อัปโหลดไฟล์เปรียบเทียบได้สูงสุด 4 ไฟล์', 'error');
      return;
    }

    this._loading.show('กำลังสแกนและดึงข้อความจากเอกสาร...');

    for (let file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['txt', 'md', 'pdf'].includes(ext)) {
        this._toast.show(`ไม่รองรับรูปแบบไฟล์ .${ext} (รองรับเฉพาะ PDF, TXT, MD)`, 'error');
        continue;
      }

      try {
        let content = '';
        if (ext === 'pdf') {
          content = await this._parsePdf(file);
        } else {
          content = await this._parseText(file);
        }

        this._uploadedFiles.push({
          name: file.name,
          size: file.size,
          type: file.type || ext,
          content: content
        });
      } catch (err) {
        this._toast.show(`ล้มเหลวในการอ่านไฟล์ ${file.name}: ${err.message}`, 'error');
      }
    }

    this._loading.hide();
    this._renderUploadedFiles();
  }

  _parseText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  }

  async _parsePdf(file) {
    // Dynamic text extraction using PDF.js loaded via CDN
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('ไม่สามารถใช้งาน PDF.js Library ได้ในขณะนี้ กรุณาเปิดอินเทอร์เน็ตเพื่อโหลด CDN');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        text += `--- หน้าที่ ${i} ---\n${pageText}\n\n`;
      }
      return text;
    } catch (e) {
      console.error('PDF parsing error', e);
      throw new Error(`ไม่สามารถอ่านข้อมูล PDF: ${e.message}`);
    }
  }

  _renderUploadedFiles() {
    const list = document.getElementById('ai-uploaded-files-list');
    if (!list) return;

    if (this._uploadedFiles.length === 0) {
      list.innerHTML = '';
      return;
    }

    list.innerHTML = this._uploadedFiles.map((file, idx) => {
      const kb = (file.size / 1024).toFixed(1);
      return `
        <div class="uploaded-file-chip" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-input); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
            <span style="font-size: 16px;">${file.name.endsWith('.pdf') ? '📄' : '📝'}</span>
            <span style="font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 260px;">${file.name}</span>
            <span style="font-size: 10px; color: var(--text-muted);">${kb} KB</span>
          </div>
          <button class="btn-icon" style="height:22px; width:22px; font-size:10px; border-color:transparent;" onclick="window.__app.aiCompare.removeFile(${idx})">✕</button>
        </div>
      `;
    }).join('');
  }

  removeFile(idx) {
    this._uploadedFiles.splice(idx, 1);
    this._renderUploadedFiles();
  }

  async analyze() {
    if (!this._llm.isConfigured()) {
      this._toast.show('กรุณาตั้งค่า URL และ API Key ของ LLM ในหน้าตั้งค่าก่อน', 'error');
      return;
    }

    const preset = document.getElementById('ai-preset-select').value;
    const customPrompt = document.getElementById('ai-custom-prompt').value.trim();
    
    let userPrompt = '';
    let systemPrompt = this._llm.buildCompareSystemPrompt();

    if (this._inputMode === 'sku') {
      const skuFields = [...document.querySelectorAll('#ai-panel-sku .compare-sku-field')];
      const skus = skuFields.map(i => i.value.trim()).filter(Boolean);

      if (skus.length < 2) {
        this._toast.show('กรุณากรอก SKU อย่างน้อย 2 ตัวเลือก', 'error');
        return;
      }

      try {
        this._loading.show('กำลังดึงข้อมูลจำเพาะสำหรับวิเคราะห์...');
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

        if (preset === 'game_theory') {
          userPrompt = this._llm.buildGameTheoryComparePrompt(products);
        } else if (preset === 'custom') {
          if (!customPrompt) {
            this._toast.show('กรุณาระบุคำสั่ง Prompt ที่คุณต้องการให้ AI วิเคราะห์', 'error');
            return;
          }
          const formattedProducts = JSON.stringify(products, null, 2);
          userPrompt = `ใช้ข้อมูลสเปก/ราคาของสินค้าดังต่อไปนี้:\n\n${formattedProducts}\n\nวิเคราะห์ตามข้อกำหนดคำสั่งต่อไปนี้:\n${customPrompt}`;
        } else {
          // Standard Pros/Cons
          userPrompt = this._llm.buildStandardComparePrompt(products);
        }

      } catch (err) {
        this._loading.hide();
        this._toast.show('ดึงข้อมูลเปรียบเทียบล้มเหลว: ' + err.message, 'error');
        return;
      }

    } else {
      // Document upload mode
      if (this._uploadedFiles.length === 0) {
        this._toast.show('กรุณาโยนหรืออัปโหลดไฟล์อย่างน้อย 1 ไฟล์', 'error');
        return;
      }

      if (preset === 'custom') {
        if (!customPrompt) {
          this._toast.show('กรุณาระบุคำสั่ง Prompt ที่คุณต้องการให้ AI วิเคราะห์', 'error');
          return;
        }
        const fileContext = this._uploadedFiles.map((f, i) => `ไฟล์ที่ ${i+1}: ${f.name}\n${f.content}`).join('\n\n');
        userPrompt = `เนื้อหาข้อมูลเอกสารที่ได้รับ:\n\n${fileContext}\n\nคำสั่งที่ให้ดำเนินการวิเคราะห์:\n${customPrompt}`;
      } else {
        userPrompt = this._llm.buildDocumentComparePrompt(this._uploadedFiles);
      }
    }

    // Call LLM API
    try {
      const response = await this._llm.query(systemPrompt, userPrompt);
      const container = document.getElementById('ai-report-container');
      const contentEl = document.getElementById('ai-report-content');

      if (contentEl && container) {
        contentEl.innerHTML = Formatters.markdown(response);
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (e) {
      this._toast.show('การวิเคราะห์ด้วย AI ล้มเหลว: ' + e.message, 'error');
    }
  }
}
