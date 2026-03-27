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
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [charCount, setCharCount] = useState(0);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);

  const MAX_DESC = 200;
  const MIN_DESC = 100;

  // ── Auth check ────────────────────────────────────────────────────────────
  useEffect(() => {
    getVerifiedUser().then((u) => setUser(u ?? null));
  }, []);

  // ── Load tags ─────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('places')
      .select('tags')
      .not('tags', 'is', null)
      .then(({ data }) => {
        if (!data) return;
        const all = new Set();
        data.forEach((p) => {
          if (Array.isArray(p.tags)) p.tags.forEach((t) => all.add(t));
        });
        setAvailableTags(Array.from(all).sort());
      });
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
        tags: selectedTags.length > 0 ? selectedTags : null,
        submitted_by: currentUser.id,
        submitter_email: currentUser.email || null,
      };

      const { error: insertError } = await supabase
        .from('place_submissions')
        .insert([placeData])
        .select()
        .single();

      if (insertError) throw new Error(insertError.message || 'Failed to submit. Please try again.');

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleTag(tag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (user === undefined) {
    return (
      <div>
        <Topbar />
        <div className="submit-container"><p className="muted">Loading…</p></div>
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div>
        <Topbar />
        <div className="submit-container">
          <div className="success-message">
            <h2>✅ Submission Received!</h2>
            <p>Thank you for submitting a place. We&apos;ll review it and add it to the map soon.</p>
            <a href="/">Back to Map</a>
            <br />
            <button
              style={{ marginTop: '1rem' }}
              className="btn btn-secondary"
              onClick={() => { setSubmitted(false); formRef.current?.reset(); setCharCount(0); setSelectedTags([]); }}
            >
              Submit Another Place
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar />
      <div className="submit-container">
        <div id="form-container">
          <h1>Submit a Place</h1>
          <p>Know a great fabric shop, leather supplier, or sewing service? Share it with the community!</p>

          {/* Auth warning for signed-out users */}
          {!user && (
            <div className="error-message">
              <strong>⚠️ Sign In Required</strong>
              <p>You need to be signed in to submit a place.</p>
              <p>
                <a href="/account" style={{ color: '#dc3545', textDecoration: 'underline' }}>
                  Click here to sign in or create an account
                </a>
              </p>
            </div>
          )}

          {error && (
            <div id="error-container" className="error-message">
              {error}
            </div>
          )}

          <form id="submit-form" className="submit-form" ref={formRef} onSubmit={handleSubmit}>
            {/* Name */}
            <div className="form-group">
              <label htmlFor="name">
                Place Name * <small>(2–200 characters)</small>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                minLength={2}
                maxLength={200}
                placeholder="e.g., Whaleys Bradford"
              />
            </div>

            {/* Category */}
            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select id="category" name="category" required>
                <option value="">Select a category...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Address */}
            <div className="form-group">
              <label htmlFor="address">Address *</label>
              <input
                type="text"
                id="address"
                name="address"
                required
                placeholder="e.g., 123 High St, London E1 6AN"
              />
              <small className="form-hint">We&apos;ll use this to add the location to the map</small>
            </div>

            {/* Website */}
            <div className="form-group">
              <label htmlFor="website">Website</label>
              <input type="url" id="website" name="website" placeholder="https://example.com" />
              <small className="form-hint">Optional</small>
            </div>

            {/* Phone */}
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input type="tel" id="phone" name="phone" placeholder="020 1234 5678" />
              <small className="form-hint">Optional</small>
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="pop_up">
                What do you like about this place? * <small>(100–200 characters)</small>
              </label>
              <textarea
                id="pop_up"
                name="pop_up"
                rows={3}
                required
                minLength={100}
                maxLength={200}
                placeholder="Tell us what makes this shop special — the fabric selection, helpful staff, unique materials..."
                onInput={(e) => setCharCount(e.target.value.length)}
              />
              <span
                id="char-count"
                className={`char-count${charCount < MIN_DESC ? ' error' : charCount >= MAX_DESC - 20 ? ' warning' : ''}`}
              >
                {charCount} / {MAX_DESC} characters
                {charCount < MIN_DESC && ` (minimum ${MIN_DESC} required)`}
              </span>
            </div>

            {/* Optional fields */}
            <details>
              <summary>Optional Details (expand for more fields)</summary>

              <div className="form-group">
                <label htmlFor="opening_hours">Opening Hours</label>
                <textarea
                  id="opening_hours"
                  name="opening_hours"
                  rows={6}
                  placeholder={`Monday: 9am-5pm\nTuesday: 9am-5pm\nWednesday: 9am-5pm\nThursday: 9am-5pm\nFriday: 9am-5pm\nSaturday: Closed\nSunday: Closed`}
                />
              </div>

              <div className="form-group">
                <label htmlFor="average_price">What are the prices like there?</label>
                <input
                  type="text"
                  id="average_price"
                  name="average_price"
                  maxLength={100}
                  placeholder="e.g., £5-15/meter, Budget-friendly, Mid-range, Premium..."
                />
                <small className="form-hint">
                  Help others know what to expect
                </small>
              </div>

              {availableTags.length > 0 && (
                <div className="form-group">
                  <label>Tags</label>
                  <div id="tags-container" className="tags-container">
                    {availableTags.map((tag) => (
                      <label key={tag}>
                        <input
                          type="checkbox"
                          name="tags"
                          value={tag}
                          checked={selectedTags.includes(tag)}
                          onChange={() => toggleTag(tag)}
                        />
                        <span>{tag}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </details>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                id="submit-btn"
                disabled={submitting || !user}
              >
                {submitting ? 'Submitting…' : user ? 'Submit Place' : 'Sign In Required'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => router.back()}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .submit-container { max-width: 700px; margin: 2rem auto; padding: 2rem; }
        .submit-form { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 1.5rem; }
        .form-group label { display: block; font-weight: 600; margin-bottom: 0.5rem; color: #333; }
        .form-group small { color: #666; font-size: 0.875rem; font-weight: normal; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; font-family: inherit; box-sizing: border-box; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #000; }
        .form-group textarea { resize: vertical; min-height: 80px; }
        .form-hint { display: block; margin-top: 0.25rem; font-size: 0.875rem; color: #666; }
        .char-count { display: block; margin-top: 0.25rem; font-size: 0.875rem; color: #666; text-align: right; }
        .char-count.warning { color: #ff6b00; }
        .char-count.error { color: #dc3545; }
        .form-actions { display: flex; gap: 1rem; margin-top: 2rem; }
        .btn { padding: 0.75rem 1.5rem; border: none; border-radius: 4px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: #000; color: #fff; }
        .btn-primary:hover:not(:disabled) { background: #333; }
        .btn-primary:disabled { background: #ccc; cursor: not-allowed; }
        .btn-secondary { background: #f0f0f0; color: #333; }
        .btn-secondary:hover { background: #e0e0e0; }
        details { margin-top: 1.5rem; padding: 1rem; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9; }
        summary { cursor: pointer; font-weight: 600; padding: 0.5rem; user-select: none; }
        .tags-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.5rem; margin-top: 0.5rem; }
        .tags-container label { display: flex; align-items: center; gap: 0.5rem; font-weight: normal; cursor: pointer; }
        .tags-container input[type="checkbox"] { width: auto; cursor: pointer; }
        .success-message { text-align: center; padding: 3rem; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .success-message h2 { color: #28a745; margin-bottom: 1rem; }
        .success-message a { display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: #000; color: #fff; text-decoration: none; border-radius: 4px; }
        .error-message { padding: 1rem; margin-bottom: 1rem; background: #fff5f5; border: 1px solid #dc3545; border-radius: 4px; color: #dc3545; }
      `}</style>
    </div>
  );
}
