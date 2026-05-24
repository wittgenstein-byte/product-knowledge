class App {
  constructor() {
    this.state = new StateService();
    this.toast = new ToastService();
    this.loading = new LoadingService();
    this.api = new ApiClient(this.state, this.loading, this.toast);
    this.nav = new NavigationService();
    this.theme = new ThemeService(this.state);
    
    // Services
    this.llm = new LlmService(this.state, this.loading, this.toast);

    // Features
    this.search = new SearchFeature(this.api, this.nav, this.toast);
    this.datasheet = new DatasheetFeature(this.api, this.toast);
    this.compare = new CompareFeature(this.state, this.api, this.loading, this.toast, this.llm);
    this.aiCompare = new AiCompareFeature(this.state, this.api, this.loading, this.toast, this.llm);
    this.pricing = new PricingFeature(this.api, this.toast);
    this.settings = new SettingsFeature(this.state, this.api, this.toast, this.nav, this.llm);
    this.metadata = new MetadataManager(this.state, this.api, this.loading, this.toast);
    this.addToCompare = (sku) => this.compare.add(sku);
  }

  init() {
    this.theme.init();
    this._initNav();
    this.search.init();
    this.datasheet.init();
    this.compare.init();
    this.aiCompare.init();
    this.pricing.init();
    this.settings.init();
    this.metadata.init();
    this.settings._updateUserDisplay();
    this.metadata.load(true);
  }

  _initNav() {
    document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
      btn.addEventListener('click', () => this.nav.navigate(btn.dataset.page));
    });
    document.getElementById('menu-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.__app = new App();
  window.__app.init();
});
