class ApiClient {
  constructor(stateService, loadingService, toastService) {
    this._state = stateService;
    this._loading = loadingService;
    this._toast = toastService;
  }

  async call(action, params, { silent = false } = {}) {
    const url = this._state.get('apiUrl');
    if (!url) {
      this._toast.show('กรุณาตั้งค่า API URL ก่อน', 'error');
      throw new Error('No API URL');
    }
    if (!silent) this._loading.show(`กำลังเรียก ${action}...`);
    try {
      const res = await fetch(url, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, params }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    } finally {
      if (!silent) this._loading.hide();
    }
  }

  async callRaw(action, params) {
    const url = this._state.get('apiUrl');
    if (!url) throw new Error('No API URL');
    const res = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, params }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }
}
