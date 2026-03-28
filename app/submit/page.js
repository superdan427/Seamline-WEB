'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import { supabase } from '@/lib/supabase';
import { getVerifiedUser } from '@/lib/storage';
import { validateName, validateUrl, validateText, validatePhone } from '@/lib/validator';

const CATEGORIES = [
  'Fabric Shop',
  'Leather',
  'Services',
  'Trimming',
  'Knit/Embroidery',
  'Markets',
  'Online',
];

export default function SubmitPage() {
  const router = useRouter();
  const [user, setUser] = useState(undefined); // undefined=loading, null=signed out
  const [charCount, setCharCount] = useState(0);
  const [showOptional, setShowOptional] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);

  const MAX_DESC = 200;
  const MIN_DESC = 50;

  // ── Auth check ────────────────────────────────────────────────────────────
  useEffect(() => {
    getVerifiedUser().then((u) => setUser(u ?? null));
  }, []);

  // ── Submit handler ────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const currentUser = await getVerifiedUser();
    if (!currentUser) {
      setError('Please sign in to submit a place. Redirecting…');
      setTimeout(() => router.push('/account'), 2000);
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData(formRef.current);
      const name = validateName(fd.get('name'), 2, 200);
      const category = fd.get('category');
      const address = fd.get('address')?.trim();

      if (!category) throw new Error('Please select a category');
      if (!address || address.length < 5) throw new Error('Please enter a valid address');

      const websiteInput = fd.get('website')?.trim();
      const website = websiteInput ? validateUrl(websiteInput, false) : null;

      const phoneInput = fd.get('phone')?.trim();
      if (phoneInput) validatePhone(phoneInput, false);

      const pop_up = validateText(fd.get('pop_up'), 200, true);
      if (pop_up.length < MIN_DESC) {
        throw new Error(`Brief description must be at least ${MIN_DESC} characters`);
      }

      validateText(fd.get('opening_hours'), 1000, false);
      const more_info = validateText(fd.get('more_info'), 2000, false);
      validateText(fd.get('average_price'), 100, false);

      const placeData = {
        name,
        category,
        address,
        pop_up,
        website: website || null,
        more_info: more_info || null,
        tags: null,
        submitted_by: currentUser.id,
        submitter_email: currentUser.email || null,
      };

      const { error: insertError } = await supabase
        .from('place_submissions')
        .insert([placeData])
        .select()
        .single();

      if (insertError) {
        if (insertError.message?.includes('Rate limit exceeded')) {
          setError('You can only submit 5 places per 24 hours. Please try again later.');
          return;
        }
        throw new Error(insertError.message || 'Failed to submit. Please try again.');
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (user === undefined) {
    return <div className="loading-state">one sec…</div>;
  }

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (user === null) {
    return (
      <div>
        <Topbar />
        <div className="submit-auth-gate">
          <p className="label-muted">You need an account to submit a place.</p>
          <button className="plain-link" onClick={() => router.push('/account')}>
            Log in or sign up
          </button>
        </div>
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div>
        <Topbar />
        <div className="submit-container">
          <div className="submit-success">
            <h2 className="title-lg">Submission received</h2>
            <p className="label-muted" style={{ marginTop: 6 }}>
              We&apos;ll review it and add it to the map soon.
            </p>
            <a href="/" className="plain-link" style={{ display: 'block', marginTop: '1.5rem' }}>
              Back to map
            </a>
            <button
              className="plain-link"
              style={{ marginTop: '0.75rem' }}
              onClick={() => {
                setSubmitted(false);
                formRef.current?.reset();
                setCharCount(0);
              }}
            >
              Submit another place
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <Topbar />
      <div className="submit-container">

        <h1 className="title-lg" style={{ marginBottom: 4 }}>Submit a place</h1>
        <p className="label-muted" style={{ marginBottom: 24 }}>
          Know a great fabric shop or supplier? Share it.
        </p>

        {error && <div className="submit-error">{error}</div>}

        <form id="submit-form" ref={formRef} onSubmit={handleSubmit}>

          {/* Place name */}
          <div className="form-field">
            <label className="form-label" htmlFor="name">Place name *</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-input"
              required
              minLength={2}
              maxLength={200}
              placeholder="e.g., Whaleys Bradford"
            />
          </div>

          <hr className="divider" />

          {/* Category */}
          <div className="form-field">
            <label className="form-label" htmlFor="category">Category *</label>
            <select id="category" name="category" className="form-input" required>
              <option value="">Select a category…</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <hr className="divider" />

          {/* Address */}
          <div className="form-field">
            <label className="form-label" htmlFor="address">Address *</label>
            <input
              type="text"
              id="address"
              name="address"
              className="form-input"
              required
              placeholder="e.g., 123 High St, London E1 6AN"
            />
            <span className="form-hint">Used to pin the location on the map</span>
          </div>

          <hr className="divider" />

          {/* Website */}
          <div className="form-field">
            <label className="form-label" htmlFor="website">Website</label>
            <input
              type="url"
              id="website"
              name="website"
              className="form-input"
              placeholder="https://example.com"
            />
          </div>

          <hr className="divider" />

          {/* Phone */}
          <div className="form-field">
            <label className="form-label" htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className="form-input"
              placeholder="020 1234 5678"
            />
          </div>

          <hr className="divider" />

          {/* Description */}
          <div className="form-field">
            <label className="form-label" htmlFor="pop_up">
              What do you like about this place? *
            </label>
            <textarea
              id="pop_up"
              name="pop_up"
              className="form-input"
              rows={3}
              required
              minLength={50}
              maxLength={200}
              placeholder="Tell us what makes this shop special…"
              onInput={(e) => setCharCount(e.target.value.length)}
            />
            <span
              className={`form-char-count${charCount < MIN_DESC ? ' error' : charCount >= MAX_DESC - 20 ? ' warning' : ''}`}
            >
              {charCount} / {MAX_DESC}
              {charCount < MIN_DESC && ` — minimum ${MIN_DESC} required`}
            </span>
          </div>

          <hr className="divider" />

          {/* Optional fields toggle */}
          <button
            type="button"
            className="plain-link"
            style={{ fontSize: '0.85rem', padding: '10px 0' }}
            onClick={() => setShowOptional((v) => !v)}
          >
            {showOptional ? 'Less fields' : 'More fields'}
          </button>

          {showOptional && (
            <>
              <hr className="divider" />

              <div className="form-field">
                <label className="form-label" htmlFor="opening_hours">Opening hours</label>
                <textarea
                  id="opening_hours"
                  name="opening_hours"
                  className="form-input"
                  rows={7}
                  placeholder={`Monday: 9am-5pm\nTuesday: 9am-5pm\nWednesday: 9am-5pm\nThursday: 9am-5pm\nFriday: 9am-5pm\nSaturday: Closed\nSunday: Closed`}
                />
              </div>

              <hr className="divider" />

              <div className="form-field">
                <label className="form-label" htmlFor="average_price">Price range</label>
                <input
                  type="text"
                  id="average_price"
                  name="average_price"
                  className="form-input"
                  maxLength={100}
                  placeholder="e.g., £5–15/meter, Budget-friendly, Premium…"
                />
              </div>
            </>
          )}

          <hr className="divider" />

          {/* Submit */}
          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="submit"
              className="submit-btn"
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
