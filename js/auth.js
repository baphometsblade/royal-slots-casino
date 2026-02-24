// ═══════════════════════════════════════════════════════
// AUTH MODULE
// ═══════════════════════════════════════════════════════


        function isServerAuthToken(token = authToken) {
            return typeof token === 'string' && token.length > 0 && !token.startsWith(LOCAL_TOKEN_PREFIX);
        }


        function shouldFallbackToLocalAuth(error) {
            if (!error) return true;
            if (error.isNetworkError) return true;
            if (error.status === 404 || error.status === 405) return true;
            return false;
        }


        function clearAuthSession() {
            authToken = null;
            localStorage.removeItem(STORAGE_KEY_TOKEN);
            currentUser = null;
            localStorage.removeItem(STORAGE_KEY_USER);
        }


        function applyAuthSession(token, user) {
            authToken = token;
            localStorage.setItem(STORAGE_KEY_TOKEN, token);
            currentUser = user ? {
                id: user.id,
                username: user.username,
                email: user.email,
                is_admin: Boolean(user.is_admin),
            } : null;
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));

            const userBalance = Number(user?.balance);
            if (Number.isFinite(userBalance)) {
                balance = userBalance;
                updateBalance();
                saveBalance();
            }
        }


        async function apiRequest(path, options = {}) {
            const method = options.method || 'GET';
            const body = options.body;
            const requireAuth = Boolean(options.requireAuth);
            const headers = { Accept: 'application/json' };
            if (body !== undefined) {
                headers['Content-Type'] = 'application/json';
            }
            if (requireAuth && authToken) {
                headers.Authorization = `Bearer ${authToken}`;
            }

            let response;
            try {
                response = await fetch(path, {
                    method,
                    headers,
                    body: body !== undefined ? JSON.stringify(body) : undefined
                });
            } catch (error) {
                const networkError = new Error('Could not reach the casino server.');
                networkError.isNetworkError = true;
                networkError.cause = error;
                throw networkError;
            }

            let payload = null;
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                try {
                    payload = await response.json();
                } catch {
                    payload = null;
                }
            } else {
                const text = await response.text();
                if (text) payload = { error: text };
            }

            if (!response.ok) {
                const message = payload?.error || payload?.message || `Request failed (${response.status})`;
                const requestError = new Error(message);
                requestError.status = response.status;
                requestError.payload = payload;
                throw requestError;
            }

            return payload || {};
        }


        async function syncServerSession() {
            if (!isServerAuthToken()) return;

            try {
                const me = await apiRequest('/api/auth/me', { requireAuth: true });
                if (me && me.user) {
                    currentUser = {
                        id: me.user.id,
                        username: me.user.username,
                        email: me.user.email,
                        is_admin: Boolean(me.user.is_admin),
                    };
                    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
                }

                const balanceRes = await apiRequest('/api/balance', { requireAuth: true });
                const serverBalance = Number(balanceRes.balance);
                if (Number.isFinite(serverBalance)) {
                    balance = serverBalance;
                    updateBalance();
                    saveBalance();
                }
            } catch (error) {
                if (error.status === 401 || error.status === 403) {
                    clearAuthSession();
                    updateAuthButton();
                    showToast('Session expired. Please log in again.', 'info');
                } else {
                    console.warn('Unable to sync server session:', error);
                }
            }
        }


        // Hash a password with SHA-256 via Web Crypto (returns hex string).
        async function hashPassword(password) {
            const encoded = new TextEncoder().encode(password);
            const buf = await crypto.subtle.digest('SHA-256', encoded);
            return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        }


        async function loginWithLocalFallback(username, password) {
            const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '{}');
            const key = username.toLowerCase();
            const user = users[key];
            if (!user) throw new Error('User not found. Please register first.');

            const hashed = await hashPassword(password);

            // Accept hashed match; also migrate legacy plaintext entries on the fly
            const isHashedMatch   = user.passwordHash && user.passwordHash === hashed;
            const isLegacyMatch   = !user.passwordHash && user.password === password;
            if (!isHashedMatch && !isLegacyMatch) throw new Error('Incorrect password.');

            if (isLegacyMatch) {
                // Upgrade to hashed storage and remove plaintext
                user.passwordHash = hashed;
                delete user.password;
                users[key] = user;
                localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
            }

            applyAuthSession(`${LOCAL_TOKEN_PREFIX}${Date.now()}`, {
                username: user.username,
                email: user.email,
                balance,
            });
            return user;
        }


        async function registerWithLocalFallback(username, email, password) {
            const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '{}');
            const key = username.toLowerCase();
            if (users[key]) throw new Error('Username already taken.');
            if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) throw new Error(`Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters.`);
            if (password.length < 6) throw new Error('Password must be at least 6 characters.');

            const passwordHash = await hashPassword(password);
            users[key] = { username, email, passwordHash };
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
            applyAuthSession(`${LOCAL_TOKEN_PREFIX}${Date.now()}`, {
                username,
                email,
                balance,
            });
        }


        async function login(username, password) {
            let serverError = null;
            try {
                const response = await apiRequest('/api/auth/login', {
                    method: 'POST',
                    body: { username, password },
                    requireAuth: false
                });
                if (!response.token || !response.user) {
                    throw new Error('Invalid login response from server.');
                }
                applyAuthSession(response.token, response.user);
                updateAuthButton();
                document.body.classList.remove('auth-gate');
                hideAuthModal();
                showToast(`Welcome back, ${response.user.username}!`, 'success');
                if (typeof checkPromoTriggers === 'function') checkPromoTriggers('login');
                if (typeof onPostAuthInit === 'function') onPostAuthInit();
                return;
            } catch (error) {
                serverError = error;
            }

            if (!shouldFallbackToLocalAuth(serverError)) {
                throw serverError;
            }

            const user = await loginWithLocalFallback(username, password);
            updateAuthButton();
            document.body.classList.remove('auth-gate');
            hideAuthModal();
            showToast(`Welcome back, ${user.username}!`, 'success');
            if (typeof checkPromoTriggers === 'function') checkPromoTriggers('login');
            if (typeof onPostAuthInit === 'function') onPostAuthInit();
        }


        async function register(username, email, password) {
            let serverError = null;
            try {
                const response = await apiRequest('/api/auth/register', {
                    method: 'POST',
                    body: { username, email, password },
                    requireAuth: false
                });
                if (!response.token || !response.user) {
                    throw new Error('Invalid registration response from server.');
                }
                applyAuthSession(response.token, response.user);
                updateAuthButton();
                document.body.classList.remove('auth-gate');
                hideAuthModal();
                showToast(`Welcome, ${response.user.username}! Your account has been created.`, 'success');
                if (typeof checkPromoTriggers === 'function') checkPromoTriggers('login');
                if (typeof onPostAuthInit === 'function') onPostAuthInit();
                return;
            } catch (error) {
                serverError = error;
            }

            if (!shouldFallbackToLocalAuth(serverError)) {
                throw serverError;
            }

            await registerWithLocalFallback(username, email, password);
            updateAuthButton();
            document.body.classList.remove('auth-gate');
            hideAuthModal();
            showToast(`Welcome, ${username}! Your account has been created.`, 'success');
            if (typeof checkPromoTriggers === 'function') checkPromoTriggers('login');
            if (typeof onPostAuthInit === 'function') onPostAuthInit();
        }


        function logout() {
            clearAuthSession();
            updateAuthButton();
            showToast('Logged out successfully.', 'info');
        }


        function updateAuthButton() {
            const label = document.getElementById('authBtnLabel');
            const btn = document.getElementById('authBtn');
            if (!btn) return;
            if (currentUser) {
                if (label) label.textContent = currentUser.username.toUpperCase();
                btn.title = 'View profile';
                btn.onclick = () => showProfileModal();
            } else {
                if (label) label.textContent = 'LOGIN';
                btn.title = 'Click to login';
                btn.onclick = () => showAuthModal();
            }
        }


        function showAuthModal() {
            const modal = document.getElementById('authModal');
            if (modal) modal.classList.add('active');
            // Reset to login tab when opening
            if (typeof switchAuthTab === 'function') switchAuthTab('login');
        }


        function hideAuthModal() {
            // When auth is required, don't allow the modal to be dismissed until signed in
            if (document.body.classList.contains('auth-gate') && !currentUser) return;
            const modal = document.getElementById('authModal');
            if (modal) modal.classList.remove('active');
            // Clear form fields and errors on close
            const errEl = document.getElementById('authError');
            if (errEl) errEl.textContent = '';
            ['loginUsername', 'loginPassword', 'regUsername', 'regEmail', 'regPassword', 'regConfirm', 'forgotEmail'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            // Reset to login form
            showForgotPassword(false);
        }


        function showForgotPassword(show) {
            const loginForm = document.getElementById('loginForm');
            const forgotForm = document.getElementById('forgotPasswordForm');
            if (show === false || show === undefined && forgotForm && forgotForm.style.display !== 'none') {
                // Show login, hide forgot
                if (loginForm) loginForm.style.display = '';
                if (forgotForm) forgotForm.style.display = 'none';
            } else {
                // Show forgot, hide login
                if (loginForm) loginForm.style.display = 'none';
                if (forgotForm) forgotForm.style.display = '';
            }
        }


        async function handleForgotPassword() {
            const email = (document.getElementById('forgotEmail')?.value || '').trim();
            const errEl = document.getElementById('authError');
            if (!email) {
                if (errEl) errEl.textContent = 'Please enter your email address.';
                return;
            }
            try {
                await apiRequest('/api/user/forgot-password', {
                    method: 'POST',
                    body: { email }
                });
                showToast('If an account with that email exists, a reset link has been sent.', 'success');
                showForgotPassword(false);
            } catch (err) {
                // Always show generic success to prevent email enumeration
                showToast('If an account with that email exists, a reset link has been sent.', 'success');
                showForgotPassword(false);
            }
        }
