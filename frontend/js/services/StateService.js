class StateService {
  constructor() {
    this._data = {
      apiUrl: localStorage.getItem('si_api_url') || '',
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
