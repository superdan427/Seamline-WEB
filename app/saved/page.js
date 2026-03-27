'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  getSavedPlaceIds,
  removeSavedPlace,
  getCollections,
  createCollection,
  deleteCollection,
  addPlaceToCollection,
  removePlaceFromCollection,
  getCollectionPlaceIds,
} from '@/lib/storage';

const BUILT_IN_FILTERS = [
  { id: 'all', label: 'All saved' },
  { id: 'fabrics', label: 'Fabrics' },
  { id: 'trimmings', label: 'Trimmings' },
  { id: 'services', label: 'Services' },
];

function matchesCategory(place, keywords) {
  const cat = (place.category || '').toLowerCase();
  return keywords.some((w) => cat.includes(w));
}

export default function SavedPage() {
  const user = useAuth();
  const router = useRouter();
  const [places, setPlaces] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [message, setMessage] = useState({ text: '', isError: false });
  const [newCollectionName, setNewCollectionName] = useState('');
  // Trigger re-renders when localStorage changes
  const [tick, setTick] = useState(0);

  function refresh() { setTick((t) => t + 1); }

  function showMessage(text, isError = false) {
    setMessage({ text, isError });
  }

  useEffect(() => {
    supabase
      .from('places')
      .select('*')
      .order('name')
      .then(({ data }) => setPlaces(data ?? []));
  }, []);

  function handleCreateCollection(e) {
    e.preventDefault();
    if (!user) { showMessage('Log in to create collections.', true); return; }
    try {
      const col = createCollection(user, newCollectionName);
      showMessage(`Collection "${col.name}" created.`, false);
      setNewCollectionName('');
      setActiveFilter(`collection:${col.id}`);
      refresh();
    } catch (err) {
      showMessage(err.message || 'Unable to create collection.', true);
    }
  }

  function handleDeleteCollection(col) {
    if (!user) return;
    if (!window.confirm(`Remove the "${col.name}" collection? This does not delete your saved places.`)) return;
    deleteCollection(user, col.id);
    if (activeFilter === `collection:${col.id}`) setActiveFilter('all');
    showMessage(`Deleted "${col.name}".`, false);
    refresh();
  }

  function handleRemovePlace(place) {
    if (!user) return;
    removeSavedPlace(user, place.id);
    showMessage(`Removed ${place.name} from saved.`, false);
    refresh();
  }

  function handleAddToCollection(place, collectionId) {
    if (!user || !collectionId) return;
    addPlaceToCollection(user, collectionId, place.id);
    const col = getCollections(user).find((c) => c.id === collectionId);
    showMessage(`Added to ${col?.name ?? 'collection'}.`, false);
    refresh();
  }

  function handleRemoveFromCollection(place, col) {
    if (!user) return;
    removePlaceFromCollection(user, col.id, place.id);
    showMessage(`Removed from ${col.name}.`, false);
    refresh();
  }

  function filterPlaces(list) {
    if (activeFilter === 'all') return list;
    if (activeFilter === 'fabrics') return list.filter((p) => matchesCategory(p, ['fabric']));
    if (activeFilter === 'trimmings') return list.filter((p) => matchesCategory(p, ['trim']));
    if (activeFilter === 'services') return list.filter((p) => matchesCategory(p, ['service', 'tailor', 'seamstress', 'atelier', 'studio']));
    if (activeFilter.startsWith('collection:')) {
      const colId = activeFilter.replace('collection:', '');
      const ids = getCollectionPlaceIds(user, colId);
      if (!ids.length) return [];
      return list.filter((p) => ids.includes(String(p.id)));
    }
    return list;
  }

  const collections = user ? getCollections(user) : [];
  const savedIds = user ? getSavedPlaceIds(user) : [];
  const savedPlaces = savedIds.map((id) => places.find((p) => String(p.id) === String(id))).filter(Boolean);
  const displayedPlaces = filterPlaces(savedPlaces);

  const allFilters = [
    ...BUILT_IN_FILTERS,
    ...collections.map((c) => ({ id: `collection:${c.id}`, label: c.name })),
  ];

  return (
    <div className="page-saved">
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-button" onClick={() => router.back()}>←</button>
        </div>
        <div className="topbar-center">
          <a href="/" style={{ textDecoration: 'inherit', color: 'inherit' }}>SEAMLINE WEB 0.95</a>
        </div>
        <div className="topbar-right" />
      </header>

      <main className="saved-page">
        <section className="account-card saved-intro">
          <h2>Saved places</h2>
          <p className="muted">Organise your favourite fabric shops into quick filters and custom folders.</p>
          {message.text && (
            <div
              id="saved-message"
              className={`account-message${message.isError ? ' error' : ''}`}
              aria-live="polite"
            >
              {message.text}
            </div>
          )}
        </section>

        {/* Guest prompt */}
        {!user && (
          <section id="saved-guest" className="account-card">
            <p>
              <a href="/account">Log in or create an account</a> to save places and build collections.
            </p>
          </section>
        )}

        {/* Authenticated content */}
        {user && (
          <div id="saved-content" className="saved-content">
            {/* Collections management */}
            <section className="account-card">
              <h3>Collections</h3>
              <form id="collection-form" onSubmit={handleCreateCollection}>
                <div className="collection-form-row">
                  <input
                    id="collection-name"
                    type="text"
                    placeholder="New collection name"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    style={{ flex: 1, border: '1px solid #ddd', borderRadius: 12, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit' }}
                  />
                  <button type="submit" className="secondary-btn">Create</button>
                </div>
              </form>

              <div id="collection-list" className="collection-list" style={{ marginTop: 16 }}>
                {collections.length === 0 ? (
                  <p className="muted">No collections yet.</p>
                ) : (
                  collections.map((col) => (
                    <div key={col.id} className="collection-chip">
                      <div className="collection-chip-info">
                        <strong>{col.name}</strong>
                        <span>{col.placeIds?.length ?? 0} places</span>
                      </div>
                      <button
                        type="button"
                        aria-label={`Delete ${col.name}`}
                        onClick={() => handleDeleteCollection(col)}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Filter row */}
            <div id="saved-filters" className="saved-filters">
              {allFilters.map((f) => (
                <button
                  key={f.id}
                  data-filter={f.id}
                  className={activeFilter === f.id ? 'active' : ''}
                  onClick={() => setActiveFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Saved cards */}
            <div id="saved-items" className="saved-cards">
              {savedIds.length === 0 ? (
                <p className="muted">You haven&apos;t saved any places yet.</p>
              ) : displayedPlaces.length === 0 ? (
                <p className="muted">No places match this filter yet.</p>
              ) : (
                displayedPlaces.map((place) => {
                  const memberships = collections.filter((c) =>
                    (c.placeIds ?? []).includes(String(place.id))
                  );
                  return (
                    <div key={place.id} className="saved-card">
                      <div className="saved-card-info">
                        <div className="saved-card-title">{place.name ?? ''}</div>
                        <div className="muted">{place.category ?? ''}</div>
                      </div>

                      <div className="saved-card-actions">
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => router.push(`/place/${encodeURIComponent(place.id)}`)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="plain-link"
                          onClick={() => handleRemovePlace(place)}
                        >
                          Remove
                        </button>
                      </div>

                      {collections.length > 0 && (
                        <div className="collection-assign">
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              handleAddToCollection(place, e.target.value);
                              e.target.value = '';
                            }}
                          >
                            <option value="">Add to collection</option>
                            {collections.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {memberships.length > 0 && (
                        <div className="saved-card-collections">
                          {memberships.map((col) => (
                            <span key={col.id} className="collection-tag">
                              {col.name}
                              <button
                                type="button"
                                className="collection-tag-remove"
                                aria-label={`Remove from ${col.name}`}
                                onClick={() => handleRemoveFromCollection(place, col)}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
