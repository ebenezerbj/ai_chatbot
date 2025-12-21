/**
 * Admin Authentication Utility
 * Centralized authentication management for all admin pages
 */

class AdminAuth {
    constructor() {
        this.tokenKey = 'adminToken';
        this.token = null;
        this.isInitializing = false;
        this.isReady = false;
        this.readyCallbacks = [];
    }

    init() {
        // Prevent double initialization
        if (this.isInitializing) {
            console.log('[AdminAuth] Already initializing, skipping');
            return;
        }
        this.isInitializing = true;

        // Check if running in an iframe - if so, trust parent authentication
        const isInIframe = window.self !== window.top;
        if (isInIframe) {
            console.log('[AdminAuth] Running in iframe, trusting parent authentication');
            this.token = localStorage.getItem(this.tokenKey);
            this.isReady = true;
            this.readyCallbacks.forEach(callback => {
                console.log('[AdminAuth] Calling ready callback (iframe mode)');
                callback();
            });
            this.readyCallbacks = [];
            return;
        }

        // Try to load token from localStorage
        this.token = localStorage.getItem(this.tokenKey);
        console.log('[AdminAuth] Token from localStorage:', this.token ? `${this.token.substring(0, 10)}...` : 'NOT FOUND');
        
        // Check if we're on a login/portal page (support various paths)
        const path = window.location.pathname.toLowerCase();
        console.log('[AdminAuth] Current path:', path);
        const isLoginPage = path.includes('admin-portal.html') || 
                           path.endsWith('admin-portal') || 
                           path === '/admin-portal';
        console.log('[AdminAuth] Is login page:', isLoginPage);
        
        // If no token and not on login page, redirect to login
        if (!this.token && !isLoginPage) {
            console.log('[AdminAuth] No token found and not on login page, redirecting to login');
            this.redirectToLogin();
            return;
        }
        
        // Don't verify token on page load - only verify when making API calls
        // This prevents unnecessary redirects and improves UX
        console.log('[AdminAuth] Initialized successfully with token:', this.token ? 'present' : 'missing');
        
        // Mark as ready and call any waiting callbacks
        this.isReady = true;
        this.readyCallbacks.forEach(callback => {
            console.log('[AdminAuth] Calling ready callback');
            callback();
        });
        this.readyCallbacks = [];
    }

    // Allow pages to wait for auth to be ready
    onReady(callback) {
        if (this.isReady) {
            callback();
        } else {
            this.readyCallbacks.push(callback);
        }
    }

    redirectToLogin() {
        const currentPage = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/admin-portal.html?redirect=${currentPage}`;
    }

    getToken() {
        if (!this.token) {
            this.token = localStorage.getItem(this.tokenKey);
        }
        return this.token;
    }

    setToken(token) {
        console.log('[AdminAuth] Token set');
        this.token = token;
        localStorage.setItem(this.tokenKey, token);
    }

    logout() {
        console.log('[AdminAuth] Logging out');
        this.token = null;
        localStorage.removeItem(this.tokenKey);
        window.location.href = '/admin-portal.html';
    }

    async fetchWithAuth(url, options = {}) {
        const token = this.getToken();
        console.log('[AdminAuth] fetchWithAuth called for:', url, 'Token:', token ? 'present' : 'MISSING');
        
        if (!token) {
            console.error('[AdminAuth] No token available for request, redirecting to login');
            this.redirectToLogin();
            throw new Error('No authentication token');
        }

        // Merge headers
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };

        console.log('[AdminAuth] Making authenticated request to:', url);

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            console.log('[AdminAuth] Response status:', response.status);

            // Handle unauthorized - token may be expired or invalid
            if (response.status === 401) {
                console.log('[AdminAuth] 401 Unauthorized, clearing token and logging out');
                this.logout();
                throw new Error('Session expired');
            }

            return response;
        } catch (error) {
            // Only redirect on auth errors, not network errors
            if (error.message === 'Session expired') {
                throw error;
            }
            // For other errors, let the caller handle them
            throw error;
        }
    }

    // Show user info in UI
    displayUserInfo(containerSelector) {
        const container = document.querySelector(containerSelector);
        if (container && this.getToken()) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #10b981; font-weight: 500;">👤 Logged in as Admin</span>
                    <button onclick="adminAuth.logout()" 
                            style="padding: 6px 12px; background: #ef4444; color: white; 
                                   border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        Logout
                    </button>
                </div>
            `;
        }
    }
}

// Create global instance - but don't initialize yet
const adminAuth = new AdminAuth();

// Initialize after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        adminAuth.init();
    });
} else {
    // DOM is already ready
    adminAuth.init();
}

// Make available globally
window.adminAuth = adminAuth;
