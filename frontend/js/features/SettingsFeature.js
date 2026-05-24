class SettingsFeature {
  constructor(stateService, apiClient, toastService, navigationService, llmService) {
    this._state = stateService;
    this._api = apiClient;
    this._toast = toastService;
    this._nav = navigationService;
    this._llm = llmService;
  }

  init() {
    this._loadForm();
    document.getElementById('btn-save-settings').addEventListener('click', () => this.save());
    document.getElementById('btn-test-api').addEventListener('click', () => this.test());
    document.getElementById('btn-test-llm')?.addEventListener('click', () => this.testLlm());
  }

  _loadForm() {
    document.getElementById('settings-api-url').value = this._state.get('apiUrl');
    document.getElementById('settings-user-name').value = this._state.get('userName');
    document.getElementById('settings-user-role').value = this._state.get('userRole');
    document.getElementById('settings-llm-url').value = this._state.get('llmApiUrl');
    document.getElementById('settings-llm-key').value = this._state.get('llmApiKey');
    document.getElementById('settings-llm-model').value = this._state.get('llmModel');
  }

  save() {
    this._state.set('apiUrl', document.getElementById('settings-api-url').value.trim());
    this._state.set('userName', document.getElementById('settings-user-name').value.trim() || 'Sales');
    this._state.set('userRole', document.getElementById('settings-user-role').value);
    
    this._state.set('llmApiUrl', document.getElementById('settings-llm-url').value.trim());
    this._state.set('llmApiKey', document.getElementById('settings-llm-key').value.trim());
    this._state.set('llmModel', document.getElementById('settings-llm-model').value.trim());

    this._state.persistApiUrl();
    this._state.persistUserName();
    this._state.persistUserRole();
    this._state.persistLlmSettings();

    this._updateUserDisplay();
    this._toast.show('บันทึกการตั้งค่าเรียบร้อย', 'success');
  }

  async test() {
    const url = document.getElementById('settings-api-url').value.trim();
    if (!url) { this._toast.show('กรุณาใส่ URL ก่อน', 'error'); return; }
    const res = document.getElementById('api-test-result');
    res.style.display = 'block';
    res.className = 'api-test-result';
    res.textContent = 'กำลังทดสอบ...';
    try {
      const r = await fetch(url, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'searchProducts', params: { query: 'test' } }),
      });
      await r.json();
      res.className = 'api-test-result success';
      res.textContent = '✓ เชื่อมต่อสำเร็จ — Apps Script ตอบสนองปกติ';
    } catch (e) {
      res.className = 'api-test-result error';
      res.textContent = '✕ เชื่อมต่อไม่ได้: ' + e.message;
    }
  }

  async testLlm() {
    const url = document.getElementById('settings-llm-url').value.trim();
    const key = document.getElementById('settings-llm-key').value.trim();
    const model = document.getElementById('settings-llm-model').value.trim();

    if (!url) {
      this._toast.show('กรุณาใส่ LLM URL ก่อน', 'error');
      return;
    }

    const res = document.getElementById('llm-test-result');
    res.style.display = 'block';
    res.className = 'api-test-result';
    res.textContent = 'กำลังทดสอบการเชื่อมต่อ LLM...';

    try {
      const reply = await this._llm.testConnection(url, key, model);
      res.className = 'api-test-result success';
      res.textContent = `✓ เชื่อมต่อ LLM สำเร็จ! การตอบสนอง: "${reply}"`;
    } catch (e) {
      res.className = 'api-test-result error';
      res.textContent = '✕ เชื่อมต่อ LLM ล้มเหลว: ' + e.message;
    }
  }

  _updateUserDisplay() {
    document.getElementById('user-name-display').textContent = this._state.get('userName');
    document.getElementById('user-avatar-display').textContent = this._state.get('userName').charAt(0).toUpperCase();
    const dot = document.getElementById('api-status').querySelector('.status-dot');
    const txt = document.getElementById('api-status-text');
    if (this._state.get('apiUrl')) {
      dot.className = 'status-dot connected';
      txt.textContent = 'เชื่อมต่อแล้ว';
    } else {
      dot.className = 'status-dot unconfigured';
      txt.textContent = 'ยังไม่ได้ตั้งค่า API';
    }
  }
}
