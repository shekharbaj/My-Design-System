// AI Design System Creator - Authentication View (Login & Registration)
import { store, DEFAULT_USERS } from '../store.js';

export class AuthView {
  constructor(container, onSuccess) {
    this.container = container;
    this.onSuccess = onSuccess;
    this.currentTab = 'login'; // 'login' | 'register'
    this.errorMessage = '';
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="auth-card">
        <!-- Header -->
        <div class="auth-header">
          <div class="auth-brand-badge">
            <span style="font-size: 15px;">❖</span>
            <span>Design Systems</span>
          </div>
          <h2>Welcome to Design Studio</h2>
          <p>Multi-system architecture, component contracts & token isolation</p>
        </div>

        <!-- Demo Credentials Quick Access Banner -->
        <div class="demo-creds-box">
          <div class="demo-creds-head">
            <span class="demo-spark">⚡</span>
            <span>Quick Demo Credentials (1-Click Auto Login):</span>
          </div>
          <div class="demo-login-buttons-row">
            <button type="button" class="btn-demo-quick" id="btn-quick-designer" title="Log in as Lead Designer">
              <span class="demo-avatar">AR</span>
              <div class="demo-details">
                <span class="demo-role">Lead Design Architect</span>
                <span class="demo-email">designer@acme.com &bull; design123</span>
              </div>
              <span class="demo-arrow">&rarr;</span>
            </button>
            <button type="button" class="btn-demo-quick" id="btn-quick-admin" title="Log in as Bimlendu Bajpayee">
              <span class="demo-avatar" style="background: #7C3AED;">BB</span>
              <div class="demo-details">
                <span class="demo-role">Bimlendu Bajpayee (Director)</span>
                <span class="demo-email">bimlendu@designsystem.io &bull; admin123</span>
              </div>
              <span class="demo-arrow">&rarr;</span>
            </button>
          </div>
          <div class="demo-info-text">
            <span>Or enter dummy credentials below: <code>designer@acme.com</code> / <code>design123</code></span>
          </div>
        </div>

        <!-- Auth Tabs (Sign In / Register) -->
        <div class="auth-tabs-row">
          <button type="button" class="auth-tab-btn ${this.currentTab === 'login' ? 'active' : ''}" id="tab-btn-login">
            Sign In
          </button>
          <button type="button" class="auth-tab-btn ${this.currentTab === 'register' ? 'active' : ''}" id="tab-btn-register">
            Create Account
          </button>
        </div>

        <!-- Auth Body Forms -->
        <div class="auth-body">
          ${this.errorMessage ? `
            <div class="auth-error-banner" id="auth-error-banner">
              <span>⚠️ ${this.errorMessage}</span>
            </div>
          ` : ''}

          ${this.currentTab === 'login' ? this.renderLoginForm() : this.renderRegisterForm()}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderLoginForm() {
    return `
      <form class="auth-form" id="form-auth-login">
        <div class="form-group">
          <label for="login-email">Email Address</label>
          <input 
            type="email" 
            id="login-email" 
            required 
            placeholder="designer@acme.com" 
            value="designer@acme.com" 
            autocomplete="email" 
          />
        </div>
        <div class="form-group">
          <label for="login-password">Password</label>
          <input 
            type="password" 
            id="login-password" 
            required 
            placeholder="design123" 
            value="design123" 
            autocomplete="current-password" 
          />
        </div>
        <button type="submit" class="btn-auth-submit" id="btn-submit-login">
          <span>Sign In to Design Studio</span>
          <span>&rarr;</span>
        </button>
      </form>
    `;
  }

  renderRegisterForm() {
    return `
      <form class="auth-form" id="form-auth-register">
        <div class="form-group">
          <label for="reg-name">Full Name</label>
          <input 
            type="text" 
            id="reg-name" 
            required 
            placeholder="e.g. Jordan Smith" 
          />
        </div>
        <div class="form-group">
          <label for="reg-email">Work Email</label>
          <input 
            type="email" 
            id="reg-email" 
            required 
            placeholder="jordan@company.com" 
            autocomplete="email" 
          />
        </div>
        <div class="form-group">
          <label for="reg-password">Password (min 4 characters)</label>
          <input 
            type="password" 
            id="reg-password" 
            required 
            placeholder="••••••••" 
            autocomplete="new-password" 
          />
        </div>
        <div class="form-group">
          <label for="reg-company">Company / Organization</label>
          <input 
            type="text" 
            id="reg-company" 
            placeholder="e.g. Acme FinTech" 
            value="Acme Corp" 
          />
        </div>
        <div class="form-group">
          <label for="reg-role">Role</label>
          <select id="reg-role">
            <option value="Lead Design Architect">Lead Design Architect</option>
            <option value="Design Systems Director">Design Systems Director</option>
            <option value="Senior UI/UX Engineer">Senior UI/UX Engineer</option>
            <option value="Product Designer">Product Designer</option>
          </select>
        </div>
        <button type="submit" class="btn-auth-submit" id="btn-submit-register">
          <span>Create Account & Workspace</span>
          <span>&rarr;</span>
        </button>
      </form>
    `;
  }

  bindEvents() {
    // Tab switching
    const tabLogin = this.container.querySelector('#tab-btn-login');
    const tabReg = this.container.querySelector('#tab-btn-register');
    if (tabLogin) {
      tabLogin.addEventListener('click', () => {
        this.currentTab = 'login';
        this.errorMessage = '';
        this.render();
      });
    }
    if (tabReg) {
      tabReg.addEventListener('click', () => {
        this.currentTab = 'register';
        this.errorMessage = '';
        this.render();
      });
    }

    // Quick demo 1-click buttons
    const btnQuickDesigner = this.container.querySelector('#btn-quick-designer');
    if (btnQuickDesigner) {
      btnQuickDesigner.addEventListener('click', () => {
        const res = store.quickDemoLogin('designer');
        if (res.success) {
          if (this.onSuccess) this.onSuccess(res.user);
        } else {
          this.errorMessage = res.error;
          this.render();
        }
      });
    }

    const btnQuickAdmin = this.container.querySelector('#btn-quick-admin');
    if (btnQuickAdmin) {
      btnQuickAdmin.addEventListener('click', () => {
        const res = store.quickDemoLogin('admin');
        if (res.success) {
          if (this.onSuccess) this.onSuccess(res.user);
        } else {
          this.errorMessage = res.error;
          this.render();
        }
      });
    }

    // Login Form Submit
    const formLogin = this.container.querySelector('#form-auth-login');
    if (formLogin) {
      formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = formLogin.querySelector('#login-email')?.value;
        const pass = formLogin.querySelector('#login-password')?.value;
        const res = store.login(email, pass);
        if (res.success) {
          if (this.onSuccess) this.onSuccess(res.user);
        } else {
          this.errorMessage = res.error;
          this.render();
        }
      });
    }

    // Register Form Submit
    const formReg = this.container.querySelector('#form-auth-register');
    if (formReg) {
      formReg.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = formReg.querySelector('#reg-name')?.value;
        const email = formReg.querySelector('#reg-email')?.value;
        const password = formReg.querySelector('#reg-password')?.value;
        const company = formReg.querySelector('#reg-company')?.value;
        const role = formReg.querySelector('#reg-role')?.value;

        const res = store.register({ name, email, password, company, role });
        if (res.success) {
          if (this.onSuccess) this.onSuccess(res.user);
        } else {
          this.errorMessage = res.error;
          this.render();
        }
      });
    }
  }
}
