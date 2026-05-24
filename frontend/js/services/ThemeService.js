class ThemeService {
  constructor(stateService) {
    this._state = stateService;
  }

  init() {
    this.apply(this._state.get('theme'));
    document.getElementById('theme-toggle').addEventListener('click', () => this.toggle());
  }

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const moon = document.getElementById('icon-moon');
    const sun = document.getElementById('icon-sun');
    if (moon) moon.style.display = theme === 'light' ? 'none' : 'block';
    if (sun) sun.style.display = theme === 'light' ? 'block' : 'none';
    this._state.set('theme', theme);
    this._state.persistTheme();
  }

  toggle() {
    this.apply(this._state.get('theme') === 'dark' ? 'light' : 'dark');
  }
}
