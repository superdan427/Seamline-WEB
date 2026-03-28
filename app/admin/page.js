'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/Topbar';
import { supabase } from '@/lib/supabase';
import { getVerifiedUser } from '@/lib/storage';

const STATUSES = ['pending', 'approved', 'rejected'];

export default function AdminPage() {
  const [authState, setAuthState] = useState('loading'); // 'loading' | 'gate' | 'panel'
  const [gateMessage, setGateMessage] = useState('Checking access…');
  const [showLoginLink, setShowLoginLink] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('pending');
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  // ── Auth + admin check ────────────────────────────────────────────────────
  useEffect(() => {
    async function checkAdmin() {
      const user = await getVerifiedUser();
      if (!user) {
        setGateMessage('You need to sign in first.');
        setShowLoginLink(true);
        setAuthState('gate');
        return;
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[admin] profile check error:', error);
        setGateMessage('Unable to verify admin access.');
        setAuthState('gate');
        return;
      }

      if (!profile || profile.role !== 'admin') {
        setGateMessage('You do not have admin access.');
        setAuthState('gate');
        return;
      }

      setAuthState('panel');
    }
    checkAdmin();
  }, []);

  // ── Load submissions when panel is shown or tab changes ───────────────────
  useEffect(() => {
    if (authState !== 'panel') return;
    loadSubmissions(currentStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState, currentStatus]);

  async function loadSubmissions(status) {
    setLoadingSubmissions(true);
    setSubmissions([]);

    const { data, error } = await supabase
      .from('place_submissions')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      showMessage('Failed to load submissions: ' + error.message, true);
    } else {
      setSubmissions(data ?? []);
    }
    setLoadingSubmissions(false);
  }

  // ── Approve ───────────────────────────────────────────────────────────────
  async function handleApprove(sub) {
    try {
      const { error } = await supabase.rpc('promote_submission', {
        submission_id: sub.id,
      });
      if (error) throw error;
      showMessage(`"${sub.name}" approved and published.`, false);
      setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
    } catch (err) {
      showMessage('Approve failed: ' + (err.message || 'Unknown error'), true);
    }
  }

  // ── Reject ────────────────────────────────────────────────────────────────
  async function handleReject(sub) {
    if (!window.confirm(`Reject "${sub.name}"? This won't delete it.`)) return;
    try {
      const { error } = await supabase.rpc('reject_submission', {
        submission_id: sub.id,
      });
      if (error) throw error;
      showMessage(`"${sub.name}" rejected.`, false);
      setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
    } catch (err) {
      showMessage('Reject failed: ' + (err.message || 'Unknown error'), true);
    }
  }

  function showMessage(text, isError) {
    setMessage({ text, isError });
    setTimeout(() => setMessage({ text: '', isError: false }), 6000);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-admin">
      <Topbar />

      <main className="admin-container">
        {/* Gate */}
        {(authState === 'loading' || authState === 'gate') && (
          <div id="admin-gate" className="admin-gate">
            <p className="muted">{gateMessage}</p>
            {showLoginLink && (
              <a
                href="/account"
                style={{ display: 'inline-block', marginTop: '1rem', color: '#111', textDecoration: 'underline' }}
              >
                Go to login
              </a>
            )}
          </div>
        )}

        {/* Panel */}
        {authState === 'panel' && (
          <div id="admin-panel">
            <h2>Submissions</h2>

            {/* Message */}
            {message.text && (
              <div
                className={`admin-message ${message.isError ? 'error' : 'success'}`}
                aria-live="polite"
              >
                {message.text}
              </div>
            )}

            {/* Tabs */}
            <div className="admin-tabs">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  className={`admin-tab${currentStatus === s ? ' active' : ''}`}
                  data-status={s}
                  onClick={() => setCurrentStatus(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {/* Count */}
            <div id="admin-count" className="admin-count">
              {loadingSubmissions
                ? 'Loading…'
                : submissions.length === 0
                ? `No ${currentStatus} submissions.`
                : `${submissions.length} ${currentStatus} submission${submissions.length !== 1 ? 's' : ''}.`}
            </div>

            {/* Cards */}
            <div id="submissions-list">
              {!loadingSubmissions && submissions.length === 0 && (
                <div className="empty-state">
                  {currentStatus === 'pending'
                    ? 'No submissions waiting for review.'
                    : `No ${currentStatus} submissions yet.`}
                </div>
              )}
              {submissions.map((sub) => (
                <SubmissionCard
                  key={sub.id}
                  sub={sub}
                  status={currentStatus}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .admin-container { max-width: 800px; margin: 2rem auto; padding: 1rem 2rem; }
        .admin-gate { text-align: center; padding: 4rem 1rem; }
        .admin-gate p { margin-top: 1rem; color: #666; }
        .admin-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
        .admin-tab { border: 1px solid #ddd; background: #fff; color: #111; padding: 8px 16px; border-radius: 12px; font-size: 14px; cursor: pointer; }
        .admin-tab.active { background: #111; color: #fff; border-color: #111; }
        .admin-count { font-size: 0.85rem; color: #666; margin-bottom: 1rem; }
        .admin-message { padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; }
        .admin-message.success { background: #d4edda; color: #155724; }
        .admin-message.error { background: #f8d7da; color: #721c24; }
        .empty-state { text-align: center; padding: 3rem 1rem; color: #999; }
      `}</style>
    </div>
  );
}

function SubmissionCard({ sub, status, onApprove, onReject }) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  async function handleApprove() {
    setApproving(true);
    await onApprove(sub);
    setApproving(false);
  }

  async function handleReject() {
    setRejecting(true);
    await onReject(sub);
    setRejecting(false);
  }

  const date = sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '';
  const fields = [
    ['Address', sub.address],
    ['Website', sub.website],
    ['Description', sub.pop_up],
    ['More info', sub.more_info],
  ];

  return (
    <div className="submission-card" data-id={sub.id}>
      <h3>{sub.name ?? 'Untitled'}</h3>
      <div className="submission-meta">
        <span className={`status-badge status-${sub.status ?? 'pending'}`}>
          {sub.status ?? 'pending'}
        </span>{' '}
        {[sub.category, sub.submitter_email, date].filter(Boolean).join(' · ')}
      </div>

      {fields.map(([label, value]) =>
        value ? (
          <div key={label} className="submission-field">
            <strong>{label}</strong>
            <span> {value}</span>
          </div>
        ) : null
      )}

      {Array.isArray(sub.tags) && sub.tags.length > 0 && (
        <div className="submission-field">
          <strong>Tags</strong>
          <div className="submission-tags">
            {sub.tags.map((tag) => (
              <span key={tag} className="submission-tag">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {status === 'pending' && (
        <div className="submission-actions">
          <button
            className="approve-btn"
            disabled={approving || rejecting}
            onClick={handleApprove}
          >
            {approving ? 'Approving…' : 'Approve'}
          </button>
          <button
            className="reject-btn"
            disabled={approving || rejecting}
            onClick={handleReject}
          >
            {rejecting ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      )}

      <style jsx>{`
        .submission-card { background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; }
        .submission-card h3 { margin: 0 0 0.25rem 0; font-size: 1.1rem; }
        .submission-meta { font-size: 0.85rem; color: #666; margin-bottom: 0.75rem; }
        .submission-field { margin-bottom: 0.5rem; font-size: 0.9rem; line-height: 1.4; }
        .submission-field strong { display: inline-block; min-width: 90px; color: #444; }
        .submission-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 0.25rem; }
        .submission-tag { background: #f0f0f0; border-radius: 20px; padding: 2px 10px; font-size: 0.8rem; color: #444; }
        .submission-actions { display: flex; gap: 0.75rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #f0f0f0; }
        .status-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-approved { background: #d4edda; color: #155724; }
        .status-rejected { background: #f8d7da; color: #721c24; }
        .approve-btn { border: 1px solid #111; background: #111; color: #fff; padding: 8px 20px; border-radius: 12px; font-size: 14px; cursor: pointer; }
        .reject-btn { border: 1px solid #ddd; background: #fff; color: #111; padding: 8px 20px; border-radius: 12px; font-size: 14px; cursor: pointer; }
        .approve-btn:disabled, .reject-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
