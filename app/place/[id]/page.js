'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Topbar from '@/components/Topbar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  isPlaceSaved,
  savePlace,
  removeSavedPlace,
  getCollections,
  addPlaceToCollection,
  createCollection,
} from '@/lib/storage';
import { sanitizeUrl, sanitizePhotoArray } from '@/lib/sanitizer';
import { isOnlinePlace } from '@/lib/filters';
import { parseOpeningHours } from '@/lib/hours';

export default function PlacePage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useAuth();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxInitialSlide, setLightboxInitialSlide] = useState(0);

  // ── Load place ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    async function load() {
      // Try slug first, then UUID
      let { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('slug', id)
        .maybeSingle();

      if (!data && !error) {
        ({ data, error } = await supabase
          .from('places')
          .select('*')
          .eq('id', id)
          .maybeSingle());
      }

      if (error) console.error('Error loading place:', error);
      setPlace(data ?? null);
      setLoading(false);
    }
    load();
  }, [id]);

  const currentUser = user ? { email: user.email, id: user.id } : null;
  const isSaved = place && currentUser ? isPlaceSaved(currentUser, place.id) : false;
  const collections = currentUser ? getCollections(currentUser) : [];
  const onlineOnly = place ? isOnlinePlace(place) : false;

  // ── Save handlers ─────────────────────────────────────────────────────────
  function handleSaveClick() {
    if (!place) return;
    if (!currentUser) { router.push('/account'); return; }
    if (isSaved) {
      removeSavedPlace(currentUser, place.id);
      setSaveStatus('Removed from saved.');
      setShowSaveOptions(false);
    } else {
      setShowSaveOptions((v) => !v);
    }
  }

  function handleQuickSave() {
    if (!place || !currentUser) return;
    savePlace(currentUser, place.id);
    setSaveStatus('Saved to your places.');
    setShowSaveOptions(false);
  }

  function handleSaveToCollection(collectionId) {
    if (!place || !currentUser || !collectionId) {
      setSaveStatus('Choose a folder first.');
      return;
    }
    addPlaceToCollection(currentUser, collectionId, place.id);
    const col = collections.find((c) => c.id === collectionId);
    setSaveStatus(`Saved to ${col?.name ?? 'folder'}.`);
    setShowSaveOptions(false);
  }

  function handleCreateAndSave(name) {
    if (!place || !currentUser || !name.trim()) {
      setSaveStatus('Name your new folder first.');
      return;
    }
    try {
      const col = createCollection(currentUser, name.trim());
      addPlaceToCollection(currentUser, col.id, place.id);
      setSaveStatus(`Created "${col.name}" and saved.`);
      setShowSaveOptions(false);
    } catch (err) {
      setSaveStatus(err.message || 'Unable to create folder.');
    }
  }

  function handlePhotoTap(index) {
    setLightboxInitialSlide(index);
    setLightboxOpen(true);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="loading-state">one sec…</div>;
  }

  if (!place) {
    return (
      <div className="page-place">
        <Topbar />
        <main id="place"><p className="muted">Place not found.</p></main>
      </div>
    );
  }

  const safePhotos = sanitizePhotoArray(Array.isArray(place.photos) ? place.photos : []);

  const normalizedWebsite = place.website
    ? /^https?:\/\//i.test(place.website)
      ? place.website
      : `https://${place.website}`
    : null;
  const safeWebsite = normalizedWebsite ? sanitizeUrl(normalizedWebsite) : null;
  const websiteLabel = safeWebsite
    ? (() => { try { return new URL(safeWebsite).hostname.replace(/^www\./i, ''); } catch { return safeWebsite.replace(/^https?:\/\//i, ''); } })()
    : null;

  const openingHoursRows = place.opening_hours ? parseOpeningHours(place.opening_hours) : null;

  return (
    <div className="page-place">
      <Topbar />

      <main id="place">
        <div className="place-header">
          <div className="place-header-left">
            <h2 id="place-name">{place.name ?? ''}</h2>
            <button
              id="place-category"
              className="category-link"
              type="button"
              onClick={() =>
                router.push(`/list?category=${encodeURIComponent(place.category ?? 'all')}`)
              }
            >
              {place.category ?? ''}
            </button>
          </div>
          <div className="place-header-right">
            <button
              id="save-place-btn"
              className="plain-link"
              type="button"
              onClick={handleSaveClick}
            >
              {isSaved ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        </div>

        <hr className="divider" />

        <p id="place-description">{place.more_info ?? place.pop_up ?? ''}</p>

        {/* Save options */}
        {showSaveOptions && (
          <SaveOptions
            collections={collections}
            onQuickSave={handleQuickSave}
            onSaveToCollection={handleSaveToCollection}
            onCreateAndSave={handleCreateAndSave}
          />
        )}
        {saveStatus && <div className="save-status">{saveStatus}</div>}

        {/* Photo carousel — full-bleed, tap to open lightbox */}
        {safePhotos.length > 0 && (
          <>
            <hr className="divider" />
            <div style={{ margin: '0 -16px' }}>
              <PhotoCarousel photos={safePhotos} onSlideClick={handlePhotoTap} />
            </div>
          </>
        )}

        <hr className="divider" />

        <div className="place-meta">
          {/* Address */}
          {!onlineOnly && place.address && typeof place.lat === 'number' && typeof place.lng === 'number' && (
            <div className="place-address">
              <a
                href={`https://maps.apple.com/?q=${encodeURIComponent(place.name)}&ll=${place.lat},${place.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {place.address}
              </a>
            </div>
          )}

          {/* Website */}
          {safeWebsite && (
            <div className="place-website">
              <a href={safeWebsite} target="_blank" rel="noopener noreferrer">
                {websiteLabel}
              </a>
            </div>
          )}

          {/* Phone */}
          {place.phone && (
            <div className="place-phone">
              <a href={`tel:${place.phone}`}>{place.phone}</a>
            </div>
          )}

          {/* Opening hours */}
          {openingHoursRows && (
            <>
              <hr className="divider" />
              <div id="place-hours" className="place-hours place-hours-list">
                {openingHoursRows.map(({ day, time }, i) => (
                  <div key={i} className="place-hours-row">
                    <span className="place-hours-day">{day}</span>
                    <span className="place-hours-time">{time}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Fullscreen lightbox */}
      {lightboxOpen && (
        <Lightbox
          photos={safePhotos}
          initialIndex={lightboxInitialSlide}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

// ── PhotoCarousel ─────────────────────────────────────────────────────────────
// Inline carousel: 4:3 crop, tap slide to open lightbox, dot indicators.

function PhotoCarousel({ photos, onSlideClick }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef(null);

  function handleScroll() {
    if (!ref.current) return;
    const w = ref.current.offsetWidth;
    if (!w) return;
    setCurrent(Math.round(ref.current.scrollLeft / w));
  }

  return (
    <div>
      <div className="carousel" ref={ref} onScroll={handleScroll}>
        {photos.map((src, i) => (
          <div
            key={i}
            className="carousel-slide"
            onClick={() => onSlideClick?.(i)}
          >
            <Image
              src={src}
              alt="Place photo"
              fill
              style={{ objectFit: 'cover' }}
              sizes="100vw"
              priority={i === 0}
            />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="carousel-dots">
          {photos.map((_, i) => (
            <span key={i} className={`carousel-dot${i === current ? ' active' : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
// Fullscreen overlay: object-fit contain so full photo is visible,
// counter top-centre, × top-left, swipe down to close.

function Lightbox({ photos, initialIndex, onClose }) {
  const [current, setCurrent] = useState(initialIndex);
  const ref = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // Scroll to the tapped slide on mount
  useEffect(() => {
    if (!ref.current) return;
    const scrollTo = () => {
      if (ref.current && initialIndex > 0) {
        ref.current.scrollLeft = initialIndex * ref.current.offsetWidth;
        setCurrent(initialIndex);
      }
    };
    requestAnimationFrame(scrollTo);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent body scroll while lightbox is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  function handleScroll() {
    if (!ref.current) return;
    const w = ref.current.offsetWidth;
    if (!w) return;
    setCurrent(Math.round(ref.current.scrollLeft / w));
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    if (touchStartY.current === null) return;
    const distY = e.changedTouches[0].clientY - touchStartY.current;
    const distX = Math.abs(e.changedTouches[0].clientX - (touchStartX.current ?? 0));
    touchStartX.current = null;
    touchStartY.current = null;
    // Close only on predominantly downward swipe (not horizontal photo-swipe)
    if (distY > 80 && distY > distX * 1.5) onClose();
  }

  return (
    <div
      className="lightbox"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header: × left, counter centre */}
      <div className="lightbox-header">
        <button
          className="lightbox-close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        {photos.length > 1 && (
          <span className="lightbox-counter">{current + 1} / {photos.length}</span>
        )}
      </div>

      {/* Scrollable photo strip */}
      <div className="lightbox-body">
        <div
          className="carousel lightbox-carousel"
          ref={ref}
          onScroll={handleScroll}
        >
          {photos.map((src, i) => (
            <div key={i} className="carousel-slide lightbox-slide">
              <Image
                src={src}
                alt="Place photo"
                fill
                style={{ objectFit: 'contain' }}
                sizes="100vw"
                priority={i === initialIndex}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      {photos.length > 1 && (
        <div className="carousel-dots carousel-dots-light">
          {photos.map((_, i) => (
            <span key={i} className={`carousel-dot${i === current ? ' active' : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── SaveOptions ───────────────────────────────────────────────────────────────

function SaveOptions({ collections, onQuickSave, onSaveToCollection, onCreateAndSave }) {
  const [selectedCollection, setSelectedCollection] = useState('');
  const [newName, setNewName] = useState('');

  return (
    <div className="save-options">
      <div className="save-options-title">Save options</div>
      <button type="button" className="save-option-btn place-save-quick" onClick={onQuickSave}>
        Save without folder
      </button>
      <div className="save-options-row">
        <select
          className="save-option-select"
          value={selectedCollection}
          onChange={(e) => setSelectedCollection(e.target.value)}
        >
          <option value="">Choose a folder</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.placeIds?.length ?? 0})
            </option>
          ))}
        </select>
        <button
          type="button"
          className="save-option-btn secondary place-save-collection"
          onClick={() => onSaveToCollection(selectedCollection)}
        >
          Save to folder
        </button>
      </div>
      <form
        className="save-options-form"
        onSubmit={(e) => {
          e.preventDefault();
          onCreateAndSave(newName);
          setNewName('');
        }}
      >
        <input
          type="text"
          className="save-option-input"
          placeholder="New folder name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" className="save-option-btn secondary">
          Create & save
        </button>
      </form>
    </div>
  );
}
