'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ text: '', isError: false });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setSessionChecked(true);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus({ text: 'Passwords do not match.', isError: true });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setStatus({ text: error.message, isError: true });
    } else {
      setStatus({ text: 'Password updated successfully. Redirecting…', isError: false });
      setTimeout(() => router.push('/account'), 2000);
    }
  }

  if (!sessionChecked) return null;

  return (
    <div className="page-account">
      <header className="topbar">
        <div className="topbar-left" />
        <div className="topbar-center">
          <a href="/" style={{ textDecoration: 'inherit', color: 'inherit' }}>SEAMLINE WEB 0.95</a>
        </div>
        <div className="topbar-right" />
      </header>

      <main className="account-page">
        <div className="account-card">
          <h2>Reset password</h2>

          {!hasSession ? (
            <p className="account-message error">Invalid or expired reset link.</p>
          ) : (
            <form onSubmit={handleSubmit} autoComplete="off">
              <label className="field-label" htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <label className="field-label" htmlFor="confirm-password">Confirm new password</label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button className="primary-btn" type="submit">Update password</button>
              {status.text && (
                <p className={status.isError ? 'account-message error' : 'account-message'}>
                  {status.text}
                </p>
              )}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
