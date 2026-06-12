// ─────────────────────────────────────────────
//  CV Sense — session.js
//  Auth guard for index.html
//  Redirects to auth.html if not logged in
//  Shows user info in the top bar
// ─────────────────────────────────────────────

const SUPABASE_URL = 'https://scdybfmayriwdktqqmxr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GGkCwihv_JImm0EJuzzPOg_hKw6vdYh';

// Load Supabase and run auth check
const _script = document.createElement('script');
_script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
_script.onload = async () => {
  window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data: { session } } = await window._supabase.auth.getSession();

  if (!session) {
    // Not logged in — redirect to login
    window.location.replace('auth.html');
    return;
  }

  // Logged in — show the app
  document.body.classList.remove('auth-loading');
  showUserBar(session.user);

  // Keep session fresh — listen for auth changes
  window._supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      window.location.replace('auth.html');
    }
  });
};
document.head.appendChild(_script);

// ── Show user info in top bar ──
function showUserBar(user) {
  const bar      = document.getElementById('user-bar');
  const emailEl  = document.getElementById('user-email');
  const avatarEl = document.getElementById('user-avatar');

  const email    = user.email || '';
  const name     = user.user_metadata?.full_name || email.split('@')[0];
  const initials = name.slice(0, 2).toUpperCase();

  emailEl.textContent  = email;
  avatarEl.textContent = initials;
  bar.style.display    = 'flex';
}

// ── Sign out ──
async function signOut() {
  await window._supabase.auth.signOut();
  window.location.replace('auth.html');
}