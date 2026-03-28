'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Topbar from '@/components/Topbar';
import { supabase } from '@/lib/supabase';
import { isOnlinePlace, getCategoriesFromPlaces, filterPlacesByCategory } from '@/lib/filters';
import { useAuth } from '@/hooks/useAuth';
import { isPlaceSaved, savePlace, removeSavedPlace, getCollections, addPlaceToCollection, createCollection } from '@/lib/storage';
import { sanitizePhotoArray, escapeHtml } from '@/lib/sanitizer';

export default function HomePage() {
  const router = useRouter();
  const user = useAuth();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mapboxglRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const userCoordsRef = useRef(null);
  const touchStartY = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [allPlaces, setAllPlaces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [modal, setModal] = useState(null); // place object or null

  // ── Mapbox init ──────────────────────────────────────────────────────────
  useEffect(() => {
    let map;
    import('mapbox-gl').then((mod) => {
      const mapboxgl = mod.default || mod;
      mapboxglRef.current = mapboxgl;
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      // Clear container before init to prevent hydration conflict
      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = '';
      }
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-0.1276, 51.5072],
        zoom: 11,
        interactive: true,
      });
      map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
      mapRef.current = map;
    });

    return () => {
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Load places ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('places')
      .select('*')
      .order('name')
      .then(({ data: places, error }) => {
        if (error || !places) return;
        const filtered = places.filter((p) => !isOnlinePlace(p));
        setAllPlaces(filtered);
        setCategories(getCategoriesFromPlaces(filtered));
      });
  }, []);

  // ── Draw markers when places or dark mode changes ─────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapboxglRef.current || allPlaces.length === 0) return;

    updateMarkers(allPlaces, mapboxglRef.current);
    requestUserLocation(mapboxglRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPlaces]);

  function updateMarkers(places, mapboxgl) {
    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    places.forEach((place) => {
      if (typeof place.lng !== 'number' || typeof place.lat !== 'number') return;
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        mapRef.current?.flyTo({ center: [place.lng, place.lat], zoom: 14 });
        setModal(place);
      });
      const marker = new mapboxgl.Marker(el)
        .setLngLat([place.lng, place.lat])
        .addTo(mapRef.current);
      markersRef.current.push(marker);
    });
  }

  function requestUserLocation(mapboxgl) {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lng: position.coords.longitude,
          lat: position.coords.latitude,
        };
        userCoordsRef.current = coords;
        userMarkerRef.current?.remove();
        const el = document.createElement('div');
        el.className = 'user-location-marker';
        userMarkerRef.current = new mapboxgl.Marker(el)
          .setLngLat([coords.lng, coords.lat])
          .addTo(mapRef.current);
        mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 12, duration: 1000 });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // ── Dark mode toggle ──────────────────────────────────────────────────────
  function toggleDarkMode(mapboxgl) {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.body.classList.toggle('dark-mode', next);
    if (mapRef.current && mapboxgl) {
      mapRef.current.setStyle(
        next ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11'
      );
      if (userCoordsRef.current) {
        mapRef.current.once('style.load', () => {
          userMarkerRef.current?.remove();
          const el = document.createElement('div');
          el.className = 'user-location-marker';
          userMarkerRef.current = new mapboxgl.Marker(el)
            .setLngLat([userCoordsRef.current.lng, userCoordsRef.current.lat])
            .addTo(mapRef.current);
        });
      }
    }
  }

  // ── Category filter ───────────────────────────────────────────────────────
  function handleFilterSelect(category) {
    setActiveCategory(category);
    const filtered = filterPlacesByCategory(allPlaces, category);
    if (!mapboxglRef.current) return;
    updateMarkers(filtered, mapboxglRef.current);
  }

  // ── Modal save logic ──────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState('');
  const [showSaveOptions, setShowSaveOptions] = useState(false);

  function handleSave() {
    if (!modal) return;
    if (!user) { router.push('/account'); return; }
    const currentUser = { email: user.email, id: user.id };
    if (isPlaceSaved(currentUser, modal.id)) {
      removeSavedPlace(currentUser, modal.id);
      setSaveStatus('Removed from saved.');
      setShowSaveOptions(false);
    } else {
      setShowSaveOptions((v) => !v);
    }
  }

  function handleQuickSave() {
    if (!modal || !user) return;
    const currentUser = { email: user.email, id: user.id };
    savePlace(currentUser, modal.id);
    setSaveStatus('Saved.');
    setShowSaveOptions(false);
  }

  function handleSaveToCollection(collectionId) {
    if (!modal || !user || !collectionId) return;
    const currentUser = { email: user.email, id: user.id };
    addPlaceToCollection(currentUser, collectionId, modal.id);
    setSaveStatus('Saved to folder.');
    setShowSaveOptions(false);
  }

  function handleCreateAndSave(name) {
    if (!modal || !user || !name.trim()) return;
    const currentUser = { email: user.email, id: user.id };
    const col = createCollection(currentUser, name.trim());
    addPlaceToCollection(currentUser, col.id, modal.id);
    setSaveStatus(`Saved to "${col.name}".`);
    setShowSaveOptions(false);
  }

  function handleModalTouchStart(e) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleModalTouchEnd(e) {
    if (touchStartY.current === null) return;
    const swipeDistance = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (swipeDistance > 80) {
      setModal(null);
      setShowSaveOptions(false);
      setSaveStatus('');
    }
  }

  const currentUserForSave = user ? { email: user.email, id: user.id } : null;
  const isSaved = modal && currentUserForSave ? isPlaceSaved(currentUserForSave, modal.id) : false;
  const collections = currentUserForSave ? getCollections(currentUserForSave) : [];

  const safePhotos = modal ? sanitizePhotoArray(Array.isArray(modal.photos) ? modal.photos : [], 4) : [];

  return (
    <div className="page-home">
      {/* Topbar overlay */}
      <Topbar
        overlay
        right={
          <button
            className="icon-button"
            aria-label="Toggle dark mode"
            aria-pressed={String(isDarkMode)}
            type="button"
            onClick={() => toggleDarkMode(mapboxglRef.current)}
          >
            {isDarkMode ? 'Light' : 'Dark'}
          </button>
        }
      />

      {/* Filter bar */}
      <div className="filterbar filterbar-overlay">
        <div className="filters-row">
          {categories.map((cat, i) => {
            const label = normalizeLabel(cat);
            return (
              <button
                key={cat}
                className={activeCategory === cat ? 'active' : ''}
                onClick={() => handleFilterSelect(cat)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="map-full" suppressHydrationWarning />

      {/* Modal */}
      {modal && (
        <div
          className="modal"
          onClick={() => { setModal(null); setShowSaveOptions(false); setSaveStatus(''); }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleModalTouchStart}
            onTouchEnd={handleModalTouchEnd}
          >
            <div className="modal-drag-handle" />
            <button
              className="modal-close"
              aria-label="Close"
              onClick={() => { setModal(null); setShowSaveOptions(false); setSaveStatus(''); }}
            >
              ×
            </button>

            <div className="modal-title">{modal.name ?? ''}</div>
            <div className="modal-sub">{modal.category ?? ''}</div>
            {modal.pop_up && <p className="modal-description">{modal.pop_up}</p>}

            {safePhotos.length > 0 && (
              <div className="modal-gallery">
                {safePhotos.map((src, i) => (
                  <Image
                    key={i}
                    src={src}
                    alt=""
                    width={240}
                    height={140}
                    style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 12 }}
                  />
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button
                className="primary-btn"
                onClick={() => router.push(`/place/${encodeURIComponent(modal.id)}`)}
              >
                More info
              </button>
              <button className="secondary-btn" onClick={handleSave}>
                {isSaved ? 'Saved' : 'Save'}
              </button>
              <button
                className="secondary-btn"
                onClick={() => { setModal(null); setShowSaveOptions(false); setSaveStatus(''); }}
              >
                Close
              </button>
            </div>

            {showSaveOptions && (
              <SaveOptions
                collections={collections}
                onQuickSave={handleQuickSave}
                onSaveToCollection={handleSaveToCollection}
                onCreateAndSave={handleCreateAndSave}
              />
            )}
            {saveStatus && <div className="save-status">{saveStatus}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeLabel(category) {
  const map = { 'fabric shop': 'Fabrics', fabrics: 'Fabrics', trimming: 'Trimmings' };
  const key = category?.toString().trim().toLowerCase();
  return map[key] ?? category;
}

function SaveOptions({ collections, onQuickSave, onSaveToCollection, onCreateAndSave }) {
  const [selectedCollection, setSelectedCollection] = useState('');
  const [newName, setNewName] = useState('');

  return (
    <div className="save-options">
      <div className="save-options-title">Save options</div>
      <button type="button" className="save-option-btn" onClick={onQuickSave}>
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
          className="save-option-btn secondary"
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
