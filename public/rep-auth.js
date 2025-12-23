/**
 * Customer Rep Authentication Utility
 * Centralized authentication management for customer service rep dashboard
 */

class RepAuth {
    constructor() {
        this.tokenKey = 'repToken';
        this.userKey = 'repUser';
        this.token = null;
        this.user = null;
        this.isInitializing = false;
        this.isReady = false;
        this.readyCallbacks = [];
    }

    init() {
        // Prevent double initialization
        if (this.isInitializing) {
            console.log('[RepAuth] Already initializing, skipping');
            return;
        }
        this.isInitializing = true;

        // Try to load token and user from localStorage
        this.token = localStorage.getItem(this.tokenKey);
        const userStr = localStorage.getItem(this.userKey);
        this.user = userStr ? JSON.parse(userStr) : null;
        
        console.log('[RepAuth] Token from localStorage:', this.token ? `${this.token.substring(0, 10)}...` : 'NOT FOUND');
        console.log('[RepAuth] User from localStorage:', this.user ? this.user.username : 'NOT FOUND');
        
        // Check if we're on the login page
        const path = window.location.pathname.toLowerCase();
        console.log('[RepAuth] Current path:', path);
        const isLoginPage = path.includes('customer-rep-dashboard.html') && !this.token;
        console.log('[RepAuth] Is login page (no token):', isLoginPage);
        
        // If no token and not showing login, redirect to dashboard which will show login
        if (!this.token && !isLoginPage) {
            console.log('[RepAuth] No token found, ensuring login screen is shown');
        }
        
        console.log('[RepAuth] Initialized with token:', this.token ? 'present' : 'missing');
        
        // Mark as ready and call any waiting callbacks
        this.isReady = true;
        this.readyCallbacks.forEach(callback => {
            console.log('[RepAuth] Calling ready callback');
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

    showLoginScreen() {
        const loginContainer = document.querySelector('.login-container');
        const dashboardContainer = document.querySelector('.dashboard-container');
        
        if (loginContainer) {
            loginContainer.style.display = 'flex';
        }
        if (dashboardContainer) {
            dashboardContainer.style.display = 'none';
        }
    }

    showDashboard() {
        const loginContainer = document.querySelector('.login-container');
        const dashboardContainer = document.querySelector('.dashboard-container');
        
        if (loginContainer) {
            loginContainer.style.display = 'none';
        }
        if (dashboardContainer) {
            dashboardContainer.style.display = 'block';
        }
    }

    getToken() {
        if (!this.token) {
            this.token = localStorage.getItem(this.tokenKey);
        }
        return this.token;
    }

    getUser() {
        if (!this.user) {
            const userStr = localStorage.getItem(this.userKey);
            this.user = userStr ? JSON.parse(userStr) : null;
        }
        return this.user;
    }

    setAuth(token, user) {
        console.log('[RepAuth] Setting authentication');
        this.token = token;
        this.user = user;
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }

    async login(username, password) {
        try {
            console.log('[RepAuth] Attempting login for:', username);
            
            const response = await fetch('/api/rep/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.token) {
                console.log('[RepAuth] Login successful');
                this.setAuth(data.token, data.user);
                return { success: true, user: data.user };
            } else {
                console.log('[RepAuth] Login failed:', data.error);
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (error) {
            console.error('[RepAuth] Login error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    async logout() {
        console.log('[RepAuth] Logging out');
        
        try {
            // Call logout endpoint if we have a token
            if (this.token) {
                await fetch('/api/rep/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });
            }
        } catch (error) {
            console.error('[RepAuth] Logout API call failed:', error);
        }

        // Clear local state
        this.token = null;
        this.user = null;
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        
        // Show login screen
        this.showLoginScreen();
    }

    async verify() {
        const token = this.getToken();
        
        if (!token) {
            console.log('[RepAuth] No token to verify');
            return false;
        }

        try {
            console.log('[RepAuth] Verifying token');
            
            const response = await fetch('/api/rep/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                console.log('[RepAuth] Token is valid');
                return true;
            } else {
                console.log('[RepAuth] Token is invalid');
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('[RepAuth] Verify error:', error);
            return false;
        }
    }

    async fetchWithAuth(url, options = {}) {
        const token = this.getToken();
        console.log('[RepAuth] fetchWithAuth called for:', url, 'Token:', token ? 'present' : 'MISSING');
        
        if (!token) {
            console.error('[RepAuth] No token available for request');
            this.showLoginScreen();
            throw new Error('No authentication token');
        }

        // Merge headers
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };

        console.log('[RepAuth] Making authenticated request to:', url);

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            console.log('[RepAuth] Response status:', response.status);

            // Handle unauthorized - token may be expired or invalid
            if (response.status === 401) {
                console.log('[RepAuth] 401 Unauthorized, logging out');
                this.logout();
                throw new Error('Session expired');
            }

            return response;
        } catch (error) {
            // Only logout on auth errors, not network errors
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
        const user = this.getUser();
        
        if (container && user) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #10b981; font-weight: 500;">👤 ${user.full_name} (${user.role === 'admin' ? 'Admin' : 'Customer Rep'})</span>
                    <button onclick="repAuth.logout()" 
                            style="padding: 6px 12px; background: #ef4444; color: white; 
                                   border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        Logout
                    </button>
                </div>
            `;
        }
    }
}

// Create global instance
const repAuth = new RepAuth();

// Initialize after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        repAuth.init();
    });
} else {
    // DOM is already ready
    repAuth.init();
}

// Make available globally
window.repAuth = repAuth;
