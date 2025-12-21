/**
 * Admin Authentication Utility
 * Centralized authentication management for all admin pages
 */

class AdminAuth {
    constructor() {
        this.tokenKey = 'adminToken';
        this.token = null;
        this.isInitializing = false;
    }

    init() {
        // Prevent double initialization
        if (this.isInitializing) return;
        this.isInitializing = true;

        // Try to load token from localStorage
        this.token = localStorage.getItem(this.tokenKey);
        
        // Check if we're on a login/portal page (support various paths)
        const path = window.location.pathname.toLowerCase();
        const isLoginPage = path.includes('admin-portal.html') || 
                           path.endsWith('admin-portal') || 
                           path === '/admin-portal';
        
        // If no token and not on login page, redirect to login
        if (!this.token && !isLoginPage) {
            console.log('[AdminAuth] No token found, redirecting to login');
            this.redirectToLogin();
            return;
        }
        
        // Don't verify token on page load - only verify when making API calls
        // This prevents unnecessary redirects and improves UX
        console.log('[AdminAuth] Initialized with token:', this.token ? 'present' : 'missing');
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
        
        if (!token) {
            console.error('[AdminAuth] No token available for request');
            this.redirectToLogin();
            throw new Error('No authentication token');
        }

        // Merge headers
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // Handle unauthorized - token may be expired or invalid
            if (response.status === 401) {
                console.log('[AdminAuth] Unauthorized response, clearing token');
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
