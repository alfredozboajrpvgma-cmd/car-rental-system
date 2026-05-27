import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PH_DEFAULT_CENTER, reverseGeocode } from '../utils/openstreetmap';

const DEFAULT_ZOOM = 13;
const SELECTED_ZOOM = 16;

const pinIcon = L.divIcon({
  className: 'location-map-pin-icon',
  html: '<div class="location-map-pin-marker" aria-hidden="true"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const LocationMapPreview = ({ value, onChange, disabled }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const reverseAbortRef = useRef(null);
  const [resolving, setResolving] = useState(false);
  const [mapError, setMapError] = useState('');

  const hasCoords = Number.isFinite(value?.lat) && Number.isFinite(value?.lng);

  const pinAtCoords = useCallback((lat, lng, { fly = true } = {}) => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], {
        icon: pinIcon,
        draggable: !disabled,
      }).addTo(map);
      markerRef.current = marker;
    }

    if (fly) {
      map.flyTo([lat, lng], SELECTED_ZOOM, { duration: 0.5 });
    }
  }, [disabled]);

  const resolvePin = useCallback(async (lat, lng) => {
    reverseAbortRef.current?.abort();
    const controller = new AbortController();
    reverseAbortRef.current = controller;
    setResolving(true);
    setMapError('');

    try {
      const place = await reverseGeocode(lat, lng, { signal: controller.signal });
      if (!controller.signal.aborted) onChange(place);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setMapError(err.message || 'Could not resolve address for this pin.');
    } finally {
      if (!controller.signal.aborted) setResolving(false);
    }
  }, [onChange]);

  const handleUserPin = useCallback((lat, lng) => {
    pinAtCoords(lat, lng, { fly: true });
    resolvePin(lat, lng);
  }, [pinAtCoords, resolvePin]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const map = L.map(containerRef.current, {
      center: [PH_DEFAULT_CENTER.lat, PH_DEFAULT_CENTER.lng],
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: !disabled,
      dragging: !disabled,
      doubleClickZoom: !disabled,
      touchZoom: !disabled,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      reverseAbortRef.current?.abort();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.dragging[disabled ? 'disable' : 'enable']();
    map.touchZoom[disabled ? 'disable' : 'enable']();
    map.doubleClickZoom[disabled ? 'disable' : 'enable']();
    map.scrollWheelZoom[disabled ? 'disable' : 'enable']();

    const marker = markerRef.current;
    if (marker) marker.dragging[disabled ? 'disable' : 'enable']();
  }, [disabled]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    const onDragEnd = () => {
      const marker = markerRef.current;
      if (!marker) return;
      const { lat, lng } = marker.getLatLng();
      handleUserPin(lat, lng);
    };

    const marker = markerRef.current;
    if (marker) {
      marker.off('dragend', onDragEnd);
      marker.on('dragend', onDragEnd);
      marker.dragging[disabled ? 'disable' : 'enable']();
    }

    return () => {
      marker?.off('dragend', onDragEnd);
    };
  }, [disabled, handleUserPin, hasCoords]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (hasCoords) {
      pinAtCoords(value.lat, value.lng, { fly: true });
      return;
    }

    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    map.setView([PH_DEFAULT_CENTER.lat, PH_DEFAULT_CENTER.lng], DEFAULT_ZOOM);
  }, [value?.lat, value?.lng, hasCoords, pinAtCoords]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || disabled) return undefined;

    const onMapClick = (e) => {
      handleUserPin(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', onMapClick);
    return () => map.off('click', onMapClick);
  }, [disabled, handleUserPin]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <MapPin size={16} color="#0033FF" />
        <span style={styles.headerText}>
          {disabled ? 'Pickup location preview' : 'Pin exact pickup location'}
        </span>
        {resolving && <Loader size={16} color="#888" />}
      </div>
      <p style={styles.hint}>
        {disabled
          ? 'Map preview of your selected address.'
          : 'Click the map or drag the pin to fine-tune where the chauffeur should meet you.'}
      </p>
      <div
        ref={containerRef}
        style={styles.map}
        role="application"
        aria-label="Pickup location map"
      />
      {mapError && <p style={styles.error}>{mapError}</p>}
    </div>
  );
};

const styles = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  header: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#444' },
  headerText: { flex: 1 },
  hint: { margin: 0, fontSize: '0.75rem', color: '#888', lineHeight: 1.4 },
  map: {
    width: '100%',
    height: '220px',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  error: { margin: 0, fontSize: '0.8rem', color: '#C62828' },
};

export default LocationMapPreview;
