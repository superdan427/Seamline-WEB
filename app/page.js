'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Topbar from '@/components/Topbar';
import { supabase } from '@/lib/supabase';
import { isOnlinePlace, getCategoriesFromPlaces, filterPlacesByCategory } from '@/lib/filters';
import { sanitizePhotoArray } from '@/lib/sanitizer';
import { getOpenStatus } from '@/lib/hours';

function OpenStatus({ openingHours }) {
  const status = getOpenStatus(openingHours);
  if (!status) return null;
  return (
    <span className={status === 'open' ? 'status-open' : 'status-closed'}>
      <span className="status-dot" />
      {status === 'open' ? 'Open' : 'Closed'}
    </span>
  );
}

function sortByProximity(places, targetPlace) {
  if (!targetPlace?.lat || !targetPlace?.lng) return places;
  return [...places].sort((a, b) => {
    const distA = Math.abs(a.lat - targetPlace.lat) + Math.abs(a.lng - targetPlace.lng);
    const distB = Math.abs(b.lat - targetPlace.lat) + Math.abs(b.lng - targetPlace.lng);
    return distA - distB;
  });
}

export default function HomePage() {
  const router = useRouter();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mapboxglRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const userCoordsRef = useRef(null);
  const sortedPlacesRef = useRef([]);
  const scrollTimer = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [allPlaces, setAllPlaces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activePlace, setActivePlace] = useState(null);

  // ── Mapbox init ──────────────────────────────────────────────────────────
  useEffect(() => {
    let map;
    import('mapbox-gl').then((mod) => {
      const mapboxgl = mod.default || mod;
      mapboxglRef.current = mapboxgl;
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
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
      map.on('click', () => setActivePlace(null));
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

  // ── Draw markers when places change ──────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapboxglRef.current || allPlaces.length === 0) return;
    updateMarkers(allPlaces, mapboxglRef.current);
    requestUserLocation(mapboxglRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPlaces]);

  function updateMarkers(places, mapboxgl) {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    places.forEach((place) => {
      if (typeof place.lng !== 'number' || typeof place.lat !== 'number') return;
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        mapRef.current?.easeTo({ center: [place.lng, place.lat], duration: 400 });
        setActivePlace(place);
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

  // ── Keyboard navigation for card carousel ────────────────────────────────
  useEffect(() => {
    if (!activePlace) return;

    const cardRow = document.querySelector('.card-row');
    if (!cardRow) return;

    function handleKeyDown(e) {
      const cardWidth = cardRow.offsetWidth * 0.8 + 12; // card width + gap
      const currentIndex = Math.round(cardRow.scrollLeft / cardWidth);
      const sorted = sortedPlacesRef.current;

      if (e.key === 'ArrowRight') {
        const nextIndex = Math.min(currentIndex + 1, sorted.length - 1);
        cardRow.scrollBy({ left: cardRow.offsetWidth * 0.8, behavior: 'smooth' });
        const place = sorted[nextIndex];
        if (place?.lat && place?.lng && mapRef.current) {
          mapRef.current.easeTo({ center: [place.lng, place.lat], duration: 500, easing: (t) => t * (2 - t) });
        }
      } else if (e.key === 'ArrowLeft') {
        const prevIndex = Math.max(currentIndex - 1, 0);
        cardRow.scrollBy({ left: -cardRow.offsetWidth * 0.8, behavior: 'smooth' });
        const place = sorted[prevIndex];
        if (place?.lat && place?.lng && mapRef.current) {
          mapRef.current.easeTo({ center: [place.lng, place.lat], duration: 500, easing: (t) => t * (2 - t) });
        }
      } else if (e.key === 'Escape') {
        setActivePlace(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePlace]);

  // ── Scroll listener — sync map to visible card ───────────────────────────
  useEffect(() => {
    if (!activePlace) return;

    const cardRow = document.querySelector('.card-row');
    if (!cardRow) return;

    const sorted = sortByProximity(allPlaces, activePlace);

    function handleScroll() {
      clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        const cardWidth = cardRow.offsetWidth * 0.8 + 12; // card width + gap
        const index = Math.round(cardRow.scrollLeft / cardWidth);
        const place = sorted[index];
        if (place?.lat && place?.lng && mapRef.current) {
          mapRef.current.easeTo({
            center: [place.lng, place.lat],
            duration: 500,
            easing: (t) => t * (2 - t),
          });
        }
      }, 80);
    }

    cardRow.addEventListener('scroll', handleScroll, { passive: true });
    return () => cardRow.removeEventListener('scroll', handleScroll);
  }, [activePlace, allPlaces]);

  // ── Card row ──────────────────────────────────────────────────────────────
  const sortedPlaces = activePlace ? sortByProximity(allPlaces, activePlace) : [];
  sortedPlacesRef.current = sortedPlaces;

  return (
    <div className="page-home">
      {/* Topbar overlay */}
      <Topbar
        overlay
        // right={
        //   <button
        //     className="icon-button"
        //     aria-label="Toggle dark mode"
        //     aria-pressed={String(isDarkMode)}
        //     type="button"
        //     onClick={() => toggleDarkMode(mapboxglRef.current)}
        //   >
        //     {isDarkMode ? 'Light' : 'Dark'}
        //   </button>
        // }
      />

      {/* Filter bar */}
      <div className="filterbar filterbar-overlay">
        <div className="filters-row">
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

      {/* Map */}
      <div ref={mapContainerRef} className="map-full" suppressHydrationWarning />

      {/* Horizontal card carousel */}
      <div className={`card-row${activePlace ? '' : ' hidden'}`}>
        {sortedPlaces.map((place) => {
          const photos = sanitizePhotoArray(Array.isArray(place.photos) ? place.photos : [], 1);
          const hasPhoto = photos.length > 0;
          return (
            <div
              key={place.id}
              className="place-card"
              onClick={() => router.push(`/place/${encodeURIComponent(place.id)}`)}
            >
              {hasPhoto ? (
                <>
                  <div className="place-card-photo">
                    <Image
                      src={photos[0]}
                      alt=""
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="80vw"
                    />
                  </div>
                  <div className="place-card-info">
                    <div className="place-card-name">{place.name ?? ''}</div>
                    <div className="place-card-meta">
                      <span>{place.category ?? ''}</span>
                      <OpenStatus openingHours={place.opening_hours} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="place-card-no-photo">
                  <div className="place-card-name">{place.name ?? ''}</div>
                  <div className="place-card-category">{place.category ?? ''}</div>
                  <OpenStatus openingHours={place.opening_hours} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function normalizeLabel(category) {
  const map = { 'fabric shop': 'Fabrics', fabrics: 'Fabrics', trimming: 'Trimmings' };
  const key = category?.toString().trim().toLowerCase();
  return map[key] ?? category;
}
