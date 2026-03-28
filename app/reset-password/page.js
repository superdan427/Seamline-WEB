'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Topbar from '@/components/Topbar';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ text: '', isError: false });
  const [success, setSuccess] = useState(false);

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
      setSuccess(true);
    }
  }

  if (!sessionChecked) return null;

  return (
    <div className="page-account">
      <Topbar />

      <main className="account-page">
        <div className="account-card">
          <h2>Reset password</h2>

          {!hasSession ? (
            <p className="account-message error">Invalid or expired reset link.</p>
          ) : success ? (
            <>
              <p className="account-message">Your password has been updated successfully.</p>
              <button className="primary-btn" type="button" onClick={() => router.push('/account')}>
                Log in
              </button>
            </>
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
                <p className="account-message error">{status.text}</p>
              )}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
