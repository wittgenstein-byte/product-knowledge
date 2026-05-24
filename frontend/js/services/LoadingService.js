class LoadingService {
  constructor() {
    this._textEl = document.getElementById('loading-text');
    this._overlayEl = document.getElementById('loading-overlay');
  }

  show(text = 'กำลังโหลด...') {
    this._textEl.textContent = text;
    this._overlayEl.style.display = 'flex';
  }

  hide() { this._overlayEl.style.display = 'none'; }
}
