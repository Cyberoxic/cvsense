// ─────────────────────────────────────────────
//  CV Sense — auth.js
//  Handles login, signup, Google OAuth
//  using Supabase JS v2 (loaded from CDN)
// ─────────────────────────────────────────────

// ── Supabase config ──
const SUPABASE_URL  = 'https://scdybfmayriwdktqqmxr.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_GGkCwihv_JImm0EJuzzPOg_hKw6vdYh';

// Load Supabase from CDN and initialise
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
    // Already logged in — go straight to the app
    window.location.href = 'index.html';
  }

  // Handle OAuth redirect (Google sign-in returns here with a hash/code)
  const params = new URLSearchParams(window.location.search);
  if (params.get('code')) {
    showMessage('Signing you in...', 'info');
    const { error } = await window._supabase.auth.exchangeCodeForSession(
      window.location.href
    );
    if (error) {
      showMessage(error.message, 'error');
    } else {
      window.location.href = 'index.html';
    }
  }
}

// ── Tab switching ──
function switchTab(tab) {
  const loginForm  = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const tabLogin   = document.getElementById('tab-login');
  const tabSignup  = document.getElementById('tab-signup');
  clearMessage();

  if (tab === 'login') {
    loginForm.style.display  = 'flex';
    signupForm.style.display = 'none';
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
  } else {
    loginForm.style.display  = 'none';
    signupForm.style.display = 'flex';
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
  }
}

// ── Google OAuth ──
async function signInWithGoogle() {
  const btn = document.getElementById('google-btn');
  btn.disabled = true;
  btn.textContent = 'Redirecting...';

  const { error } = await window._supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://cv-analyst.netlify.app/auth.html'
    }
  });

  if (error) {
    showMessage(error.message, 'error');
    btn.disabled = false;
    btn.innerHTML = `
      <svg class="google-icon" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google`;
  }
}

// ── Email Login ──
async function handleLogin(e) {
  e.preventDefault();
  const btn      = document.getElementById('login-btn');
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  btn.disabled    = true;
  btn.textContent = 'Signing in...';
  clearMessage();

  const { error } = await window._supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showMessage(error.message, 'error');
    btn.disabled    = false;
    btn.textContent = 'Sign In';
  } else {
    showMessage('Signed in! Redirecting...', 'success');
    setTimeout(() => window.location.href = 'index.html', 800);
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
  btn.textContent = 'Creating account...';
  clearMessage();

  const { error } = await window._supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: window.location.origin + '/index.html'
    }
  });

  if (error) {
    showMessage(error.message, 'error');
    btn.disabled    = false;
    btn.textContent = 'Create Account';
  } else {
    showMessage(
      '✅ Account created! Check your email to confirm your account, then sign in.',
      'success'
    );
    btn.disabled = true;
  }
}

// ── Message helpers ──
function showMessage(text, type) {
  const el = document.getElementById('auth-message');
  el.textContent  = text;
  el.className    = `auth-message ${type}`;
}

function clearMessage() {
  const el = document.getElementById('auth-message');
  el.className    = 'auth-message';
  el.textContent  = '';
}
