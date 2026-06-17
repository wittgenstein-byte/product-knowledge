class StateService {
  constructor() {
    let defaultApiUrl = 'http://localhost:4000/api';
    if (window.location.protocol.startsWith('http')) {
      defaultApiUrl = window.location.origin + '/si-api/';
    }

    let savedApiUrl = localStorage.getItem('si_api_url');
    // หากเปิดผ่าน Server จริง แต่เครื่องจำค่าเป็น localhost ให้ล้างและบังคับใช้ของ Server จริงทันที
    if (window.location.protocol.startsWith('http') && 
        !window.location.hostname.includes('localhost') && 
        !window.location.hostname.includes('127.0.0.1')) {
      if (!savedApiUrl || savedApiUrl.includes('localhost') || savedApiUrl.includes('127.0.0.1')) {
        savedApiUrl = window.location.origin + '/si-api/';
        localStorage.setItem('si_api_url', savedApiUrl); // บันทึกทับทันทีเพื่อไม่ให้ค้าง
      }
    }

    this._data = {
      apiUrl: savedApiUrl || defaultApiUrl,
      userName: localStorage.getItem('si_user_name') || 'Sales',
      userRole: localStorage.getItem('si_user_role') || 'sales',
      theme: localStorage.getItem('si_theme') || 'dark',
      compareSkus: [],
      metadata: null,
      llmApiUrl: localStorage.getItem('si_llm_api_url') || 'https://gen.ai.kku.ac.th/api/v1',
      llmApiKey: localStorage.getItem('si_llm_api_key') || '',
      llmModel: localStorage.getItem('si_llm_model') || 'gemini-2.5-flash-lite',
    };
  }

  get(key) { return this._data[key]; }
  set(key, val) { this._data[key] = val; }

  persistApiUrl() { localStorage.setItem('si_api_url', this._data.apiUrl); }
  persistUserName() { localStorage.setItem('si_user_name', this._data.userName); }
  persistUserRole() { localStorage.setItem('si_user_role', this._data.userRole); }
  persistTheme() { localStorage.setItem('si_theme', this._data.theme); }

  persistLlmSettings() {
    localStorage.setItem('si_llm_api_url', this._data.llmApiUrl);
    localStorage.setItem('si_llm_api_key', this._data.llmApiKey);
    localStorage.setItem('si_llm_model', this._data.llmModel);
  }
}
