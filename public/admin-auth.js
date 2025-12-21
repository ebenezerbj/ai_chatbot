/**
 * Admin Authentication Utility
 * Centralized authentication management for all admin pages
 */

class AdminAuth {
    constructor() {
        this.tokenKey = 'adminToken';
        this.token = null;
        this.init();
    }

    init() {
        // Try to load token from localStorage
        this.token = localStorage.getItem(this.tokenKey);
        
        // Check if we're on a login/portal page
        const isLoginPage = window.location.pathname.includes('admin-portal.html');
        
        // If no token and not on login page, redirect to login
        if (!this.token && !isLoginPage) {
            this.redirectToLogin();
        }
        
        // If we have a token, verify it's still valid
        if (this.token && !isLoginPage) {
            this.verifyToken();
        }
    }

    redirectToLogin() {
        const currentPage = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/admin-portal.html?redirect=${currentPage}`;
    }

    async verifyToken() {
        try {
            const response = await fetch('/api/admin/verify', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                // Token is invalid, clear and redirect
                this.logout();
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            // Continue anyway, will fail on actual API calls
        }
    }

    getToken() {
        return this.token || localStorage.getItem(this.tokenKey);
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem(this.tokenKey, token);
    }

    logout() {
        this.token = null;
        localStorage.removeItem(this.tokenKey);
        this.redirectToLogin();
    }

    async fetchWithAuth(url, options = {}) {
        const token = this.getToken();
        
        if (!token) {
            this.redirectToLogin();
            throw new Error('No authentication token');
        }

        // Merge headers
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        // Handle unauthorized
        if (response.status === 401) {
            this.logout();
            throw new Error('Unauthorized');
        }

        return response;
    }

    // Show user info in UI
    displayUserInfo(containerSelector) {
        const container = document.querySelector(containerSelector);
        if (container && this.token) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span>👤 Admin</span>
                    <button onclick="adminAuth.logout()" 
                            style="padding: 6px 12px; background: #ef4444; color: white; 
                                   border: none; border-radius: 6px; cursor: pointer;">
                        Logout
                    </button>
                </div>
            `;
        }
    }
}

// Create global instance
const adminAuth = new AdminAuth();

// Make available globally
window.adminAuth = adminAuth;
