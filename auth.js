// ─────────────────────────────────────────────
//  CV Sense — auth.js
// ─────────────────────────────────────────────

const SUPABASE_URL = 'https://scdybfmayriwdktqqmxr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GGkCwihv_JImm0EJuzzPOg_hKw6vdYh';
const SITE_URL     = 'https://cvsense.netlify.app';

const supabaseScript = document.createElement('script');
supabaseScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
supabaseScript.onload = () => {
  window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  checkExistingSession();
};
document.head.appendChild(supabaseScript);

// ── Check if user is already logged in ──
async function checkExistingSession() {
  const { data: { session } } = await window._supabase.auth.getSession();
  if (session) {
    window.location.href = '/app';
    return;
  }

  // Handle OAuth / email confirmation redirect
  const params = new URLSearchParams(window.location.search);
  if (params.get('code')) {
    showMessage('Signing you in…', 'info');
    const { error } = await window._supabase.auth.exchangeCodeForSession(
      window.location.href
    );
    if (error) {
      showMessage(friendlyError(error), 'error');
    } else {
      window.location.href = '/app';
    }
  }
}

// ── Tab switching ──
function switchTab(tab) {
  clearMessage();
  const isLogin = tab === 'login';
  document.getElementById('login-form').style.display  = isLogin ? 'flex' : 'none';
  document.getElementById('signup-form').style.display = isLogin ? 'none' : 'flex';
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-signup').classList.toggle('active', !isLogin);
}

// ── Google OAuth ──
async function signInWithGoogle() {
  const btn = document.getElementById('google-btn');
  btn.disabled    = true;
  btn.textContent = 'Redirecting…';

  const { error } = await window._supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: SITE_URL + '/login' }
  });

  if (error) {
    showMessage(friendlyError(error), 'error');
    btn.disabled  = false;
    btn.innerHTML = googleBtnHTML();
  }
}

// ── Email Login ──
async function handleLogin(e) {
  e.preventDefault();
  const btn      = document.getElementById('login-btn');
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  btn.disabled    = true;
  btn.textContent = 'Signing in…';
  clearMessage();

  const { error } = await window._supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showMessage(friendlyError(error), 'error');
    btn.disabled    = false;
    btn.textContent = 'Sign In';
  } else {
    showMessage('Signed in! Redirecting…', 'success');
    setTimeout(() => window.location.href = '/app', 800);
  }
}

// ── Email Signup ──
async function handleSignup(e) {
  e.preventDefault();
  const btn      = document.getElementById('signup-btn');
  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  btn.disabled    = true;
  btn.textContent = 'Creating account…';
  clearMessage();

  const { data, error } = await window._supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: SITE_URL + '/login'
    }
  });

  if (error) {
    // Supabase returns this specific error when email already exists
    const msg = error.message.toLowerCase();
    if (
      msg.includes('already registered') ||
      msg.includes('already exists') ||
      msg.includes('user already') ||
      error.status === 422
    ) {
      showMessage('An account with this email already exists. Please sign in instead.', 'error');
    } else {
      showMessage(friendlyError(error), 'error');
    }
    btn.disabled    = false;
    btn.textContent = 'Create Account';
    return;
  }

  // Supabase quirk: if email exists AND email confirmation is ON,
  // it returns data.user but with identities = [] (empty array)
  if (data?.user && data.user.identities && data.user.identities.length === 0) {
    showMessage('An account with this email already exists. Please sign in instead.', 'error');
    btn.disabled    = false;
    btn.textContent = 'Create Account';
    return;
  }

  // Genuine new signup
  showMessage(
    '✅ Account created! Check your inbox (and spam folder) for a confirmation email',
    'success'
  );
  btn.disabled = true;
}

// ── Friendly error messages ──
function friendlyError(error) { // Supabase errors can be technical, so we map common ones to user-friendly messages
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already'))
    return 'An account with this email already exists. Please sign in instead.';
  if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('wrong password'))
    return 'Incorrect email or password. Please try again.';
  if (msg.includes('email not confirmed'))
    return 'Please confirm your email first. Check your inbox for the verification link.';
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Too many attempts. Please wait a minute and try again.';
  if (msg.includes('weak password') || msg.includes('password should'))
    return 'Password must be at least 6 characters.';
  if (msg.includes('invalid email'))
    return 'Please enter a valid email address.';
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Network error. Please check your connection and try again.';
  return error.message || 'Something went wrong. Please try again.';
}

function googleBtnHTML() {
  return `<svg class="google-icon" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
  Continue with Google`;
}

function showMessage(text, type) {
  const el = document.getElementById('auth-message');
  el.textContent = text;
  el.className   = `auth-message ${type}`;
}

function clearMessage() {
  const el = document.getElementById('auth-message');
  el.className   = 'auth-message';
  el.textContent = '';
}