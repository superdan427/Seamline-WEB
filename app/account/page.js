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
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-button" onClick={() => router.back()}>←</button>
        </div>
        <div className="topbar-center">
          <a href="/" style={{ textDecoration: 'inherit', color: 'inherit' }}>SEAMLINE WEB 0.95</a>
        </div>
        <div className="topbar-right" />
      </header>

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
