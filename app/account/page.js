'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { signupUser, loginUser, logoutUser, getSavedPlaceIds } from '@/lib/storage';

export default function AccountPage() {
  const user = useAuth(); // undefined=loading, null=signed out, obj=signed in
  const router = useRouter();
  const [message, setMessage] = useState({ text: '', isError: false });
  const [places, setPlaces] = useState([]);
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '' });
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState({ text: '', isError: false });

  // Load all places once (for saved places display)
  useEffect(() => {
    supabase
      .from('places')
      .select('*')
      .order('name')
      .then(({ data }) => setPlaces(data ?? []));
  }, []);

  function showMessage(text, isError = false) {
    setMessage({ text, isError });
  }

  // ── Signup ────────────────────────────────────────────────────────────────
  async function handleSignup(e) {
    e.preventDefault();
    try {
      const u = await signupUser({
        name: signupData.name.trim(),
        email: signupData.email.trim().toLowerCase(),
        password: signupData.password,
      });
      showMessage(`Welcome, ${u?.name || 'friend'}!`, false);
      setSignupData({ name: '', email: '', password: '' });
    } catch (err) {
      showMessage(err.message || 'Unable to sign up.', true);
    }
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    try {
      await loginUser({
        email: loginData.email.trim().toLowerCase(),
        password: loginData.password,
      });
      showMessage('Logged in successfully.', false);
      setLoginData({ email: '', password: '' });
    } catch (err) {
      showMessage(err.message || 'Login failed.', true);
    }
  }

  // ── OAuth ─────────────────────────────────────────────────────────────────
  async function handleGoogleSignIn() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${siteUrl}/account` },
    });
  }

  async function handleAppleSignIn() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${siteUrl}/account` },
    });
  }

  // ── Forgot password ───────────────────────────────────────────────────────
  async function handleForgotPassword(e) {
    e.preventDefault();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
      redirectTo: `${siteUrl}/reset-password`,
    });
    if (error) {
      setForgotStatus({ text: error.message, isError: true });
    } else {
      setForgotStatus({ text: 'Check your email for a reset link.', isError: false });
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async function handleLogout() {
    try {
      await logoutUser();
      showMessage('You have been logged out.', false);
    } catch (err) {
      showMessage(err.message || 'Unable to log out.', true);
    }
  }

  // ── Saved places list ─────────────────────────────────────────────────────
  function renderSaved() {
    if (!user) return <p className="muted">Log in to see saved places.</p>;
    const ids = getSavedPlaceIds(user);
    if (!ids.length) return <p className="muted">You haven&apos;t saved any places yet.</p>;
    const saved = places.filter((p) => ids.includes(String(p.id)));
    if (!saved.length) return <p className="muted">Loading your saved places…</p>;
    return saved.map((place) => (
      <div key={place.id} className="saved-item">
        <div className="saved-item-title">
          <span>{place.name ?? ''}</span>
          <span className="muted">{place.category ?? ''}</span>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/place/${encodeURIComponent(place.id)}`)}
        >
          View
        </button>
      </div>
    ));
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-account">
      <Topbar />

      <main className="account-page">
        {/* Message */}
        {message.text && (
          <div
            id="account-message"
            className={`account-message${message.isError ? ' error' : ''}`}
            aria-live="polite"
          >
            {message.text}
          </div>
        )}

        {/* Auth panels — shown when signed out */}
        {(user === null || user === undefined) && (
          <section id="auth-panels" className="account-grid">
            <div className="account-card">
              <h2>Create an account</h2>
              <p className="muted">Save your favourite fabric shops so you can come back to them later.</p>
              <form id="signup-form" autoComplete="off" onSubmit={handleSignup}>
                <label className="field-label" htmlFor="signup-name">Name</label>
                <input
                  id="signup-name"
                  name="name"
                  type="text"
                  required
                  value={signupData.name}
                  onChange={(e) => setSignupData((d) => ({ ...d, name: e.target.value }))}
                />
                <label className="field-label" htmlFor="signup-email">Email</label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  required
                  value={signupData.email}
                  onChange={(e) => setSignupData((d) => ({ ...d, email: e.target.value }))}
                />
                <label className="field-label" htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  name="password"
                  type="password"
                  required
                  value={signupData.password}
                  onChange={(e) => setSignupData((d) => ({ ...d, password: e.target.value }))}
                />
                <button className="primary-btn" type="submit">Sign up</button>
              </form>
            </div>

            <div className="account-card">
              <h2>Log in</h2>
              <p className="muted">Already have an account on this device?</p>
              <form id="login-form" autoComplete="off" onSubmit={handleLogin}>
                <label className="field-label" htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  value={loginData.email}
                  onChange={(e) => setLoginData((d) => ({ ...d, email: e.target.value }))}
                />
                <label className="field-label" htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  required
                  value={loginData.password}
                  onChange={(e) => setLoginData((d) => ({ ...d, password: e.target.value }))}
                />
                <button className="secondary-btn" type="submit">Log in</button>
              </form>

              <div className="oauth-divider">
                <span>or continue with</span>
              </div>

              <button type="button" className="oauth-btn oauth-btn-google" onClick={handleGoogleSignIn}>
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Continue with Google
              </button>

              <button type="button" className="oauth-btn oauth-btn-apple" onClick={handleAppleSignIn}>
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#ffffff" d="M14.93 9.617c-.022-2.198 1.796-3.26 1.878-3.313-1.024-1.496-2.617-1.7-3.183-1.722-1.352-.138-2.645.8-3.33.8-.685 0-1.745-.782-2.872-.76-1.475.022-2.843.862-3.601 2.183-1.539 2.665-.394 6.613 1.107 8.776.737 1.058 1.612 2.244 2.758 2.2 1.112-.044 1.529-.714 2.872-.714 1.343 0 1.717.714 2.893.692 1.19-.022 1.944-1.08 2.67-2.143a9.879 9.879 0 0 0 1.22-2.464c-.027-.011-2.386-.916-2.412-3.535zM12.671 3.16C13.27 2.43 13.676 1.43 13.56.41c-.857.036-1.904.572-2.523 1.29-.553.638-1.04 1.665-.908 2.644.957.073 1.934-.486 2.542-1.184z"/>
                </svg>
                Continue with Apple
              </button>

              <button
                type="button"
                className="forgot-password-toggle"
                onClick={() => { setShowForgot((v) => !v); setForgotStatus({ text: '', isError: false }); }}
              >
                Forgot password?
              </button>

              {showForgot && (
                <form className="forgot-password-form" onSubmit={handleForgotPassword}>
                  <label className="field-label" htmlFor="forgot-email">Email address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                  <button className="secondary-btn" type="submit">Send reset link</button>
                  {forgotStatus.text && (
                    <p className={forgotStatus.isError ? 'account-message error' : 'account-message'}>
                      {forgotStatus.text}
                    </p>
                  )}
                </form>
              )}
            </div>
          </section>
        )}

        {/* Dashboard — shown when signed in */}
        {user && (
          <section id="account-dashboard" className="account-card">
            <div className="account-header">
              <div>
                <h2>Hi, <span id="account-name">{user.name}</span></h2>
                <p className="muted" id="account-email">{user.email}</p>
              </div>
              <button
                id="logout-btn"
                className="icon-button"
                type="button"
                aria-label="Log out"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>

            <div className="saved-section">
              <h3>Saved places</h3>
              <div id="saved-list" className="saved-list">
                {renderSaved()}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
