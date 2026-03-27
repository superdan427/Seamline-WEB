'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import { supabase } from '@/lib/supabase';

function normalizeTag(tag) {
  if (tag == null) return '';
  return String(tag).trim().toLowerCase();
}

function buildTagOptions(places) {
  const counts = new Map();
  const labels = new Map();
  (places || []).forEach((place) => {
    (place.tags || []).forEach((tag) => {
      const key = normalizeTag(tag);
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
      if (!labels.has(key)) labels.set(key, String(tag));
    });
  });
  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 7)
    .map(([key]) => ({ value: key, label: labels.get(key) || key }));
}

export default function SearchPage() {
  const router = useRouter();
  const [allPlaces, setAllPlaces] = useState([]);
  const [tagOptions, setTagOptions] = useState([]);
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState('');
  const debounceRef = useRef(null);

  // Load all places + tag options on mount
  useEffect(() => {
    supabase
      .from('places')
      .select('*')
      .order('name')
      .then(({ data, error }) => {
        if (error || !data) return;
        setAllPlaces(data);
        setTagOptions(buildTagOptions(data));
        setResults(data);
        setSummary(`${data.length} place${data.length !== 1 ? 's' : ''} match your search.`);
      });
  }, []);

  // Run search whenever query or selectedTags changes
  const runSearch = useCallback(
    async (q, tags) => {
      let dbQuery = supabase.from('places').select('*');
      if (q && q.trim()) {
        dbQuery = dbQuery.textSearch('search_vector', q.trim());
      }
      const { data, error } = await dbQuery.order('name');
      if (error) { console.error('Search error:', error); return; }

      const filtered =
        tags.size > 0
          ? (data ?? []).filter((p) => p.tags?.some((t) => tags.has(normalizeTag(t))))
          : (data ?? []);

      setResults(filtered);
      setSummary(
        filtered.length === 0
          ? 'No places match yet. Try another keyword or tag.'
          : `${filtered.length} place${filtered.length !== 1 ? 's' : ''} match your search.`
      );
    },
    []
  );

  function handleQueryChange(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val, selectedTags), 300);
  }

  function handleClear() {
    setQuery('');
    setSelectedTags(new Set());
    runSearch('', new Set());
  }

  function toggleTag(tag) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      runSearch(query, next);
      return next;
    });
  }

  function handleTagClick(tag) {
    const normalized = normalizeTag(tag);
    setQuery('');
    setSelectedTags(new Set([normalized]));
    runSearch('', new Set([normalized]));
  }

  return (
    <div className="page-search">
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-button" onClick={() => router.back()} aria-label="Back">←</button>
        </div>
        <div className="topbar-center">
          <a href="/" style={{ textDecoration: 'inherit', color: 'inherit' }}>SEAMLINE WEB 0.95</a>
        </div>
        <div className="topbar-right" />
      </header>

      <main>
        <section className="search-hero">
          <h2>Search Seamline</h2>
          <p>find fabrics, shops, places, or just your purpose in life using the search bar below.</p>
        </section>

        <section className="account-card">
          <div className="search-bar">
            <input
              type="search"
              id="search-input"
              placeholder='Try "silk", "denim", "trimmings"…'
              aria-label="Search places"
              value={query}
              onChange={handleQueryChange}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runSearch(query, selectedTags); } }}
            />
            <button
              type="button"
              className={`search-clear${query ? ' visible' : ''}`}
              id="clear-search"
              aria-label="Clear search"
              onClick={handleClear}
            >
              ×
            </button>
          </div>

          {tagOptions.length > 0 && (
            <div className="tag-filters" id="tag-filters" aria-label="Tag filters">
              {tagOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`tag-filter${selectedTags.has(opt.value) ? ' active' : ''}`}
                  onClick={() => toggleTag(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="account-card">
          <div id="search-summary" className="muted">{summary}</div>
          <div className="search-results" id="search-results">
            {results.map((place) => {
              const area = place.address ? place.address.split(',')[1]?.trim() : '';
              const topTags = Array.isArray(place.tags) ? place.tags.slice(0, 6) : [];
              return (
                <article key={place.id} className="search-result-card">
                  <h3>{place.name ?? ''}</h3>
                  <div className="search-result-meta">
                    {[place.category, area].filter(Boolean).join(' · ')}
                  </div>
                  <p className="muted">{place.pop_up ?? ''}</p>
                  {topTags.length > 0 && (
                    <div className="search-result-tags">
                      {topTags.map((tag) => (
                        <span
                          key={tag}
                          className="search-result-tag"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleTagClick(tag)}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => router.push(`/place/${encodeURIComponent(place.id)}`)}
                  >
                    View details
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
