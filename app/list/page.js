'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Topbar from '@/components/Topbar';
import { supabase } from '@/lib/supabase';
import { getCategoriesFromPlaces, filterPlacesByCategory } from '@/lib/filters';

// Helper copied from ui/list.js
function normalizeLabel(category) {
  const map = { 'fabric shop': 'Fabrics', fabrics: 'Fabrics', trimming: 'Trimmings' };
  const key = category?.toString().trim().toLowerCase();
  return map[key] ? (map[key].charAt(0).toUpperCase() + map[key].slice(1)) : category;
}

function slugify(value) {
  return (value || '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || 'all';
}

const PREFERRED_ORDER = ['all', 'fabrics', 'trimmings', 'knit/embroidery', 'leather', 'services', 'markets'];

function orderCategories(categories) {
  const normalized = categories.map((cat) => ({
    raw: cat,
    normalized: normalizeLabel(cat)?.toString().trim().toLowerCase(),
  }));
  const ordered = PREFERRED_ORDER.map((key) => normalized.find((e) => e.normalized === key)).filter(Boolean);
  const remaining = normalized.filter((e) => !PREFERRED_ORDER.includes(e.normalized));
  return [...ordered.map((e) => e.raw), ...remaining.map((e) => e.raw)];
}

export default function ListPage() {
  return (
    <Suspense fallback={<div className="loading-state">one sec…</div>}>
      <ListPageInner />
    </Suspense>
  );
}

function ListPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get('category') || 'all';

  const [allPlaces, setAllPlaces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(categoryFromUrl);
  const [displayed, setDisplayed] = useState([]);

  useEffect(() => {
    supabase
      .from('places')
      .select('*')
      .order('name')
      .then(({ data, error }) => {
        if (error || !data) return;
        setAllPlaces(data);
        const cats = getCategoriesFromPlaces(data, { includeOnline: true });
        setCategories(orderCategories(cats));
        setDisplayed(filterPlacesByCategory(data, categoryFromUrl));
      });
  }, [categoryFromUrl]);

  function handleFilterSelect(cat) {
    setActiveCategory(cat);
    setDisplayed(filterPlacesByCategory(allPlaces, cat));
  }

  return (
    <div className="page-list">
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-button" onClick={() => router.back()} aria-label="Back">←</button>
        </div>
        <div className="topbar-center">
          <a href="/" style={{ textDecoration: 'inherit', color: 'inherit' }}>SEAMLINE WEB 0.95</a>
        </div>
        <div className="topbar-right" />
      </header>

      {/* Filter bar */}
      <div className="filterbar">
        <div id="filters" className="filters-row">
          {categories.map((cat) => {
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

      {/* List */}
      <main id="list">
        <div id="list-items">
          {displayed.map((place) => (
            <div
              key={place.id}
              className="list-item"
              onClick={() => router.push(`/place/${encodeURIComponent(place.id)}`)}
            >
              <div className="place-name">{place.name ?? ''}</div>
              <div className="place-category">{place.category ?? ''}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
