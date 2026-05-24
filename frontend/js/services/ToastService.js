class ToastService {
  constructor() {
    this._container = document.getElementById('toast-container');
  }

  show(msg, type = 'info', duration = 3500) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    this._container.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }
}
