import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader, MapPin, Search } from 'lucide-react';
import LocationMapPreview from './LocationMapPreview';
import { searchPlaces } from '../utils/openstreetmap';

const DEBOUNCE_MS = 450;
const MIN_QUERY_LENGTH = 3;

const CustomLocationPicker = ({ value, onChange, disabled, placeholder }) => {
  const [query, setQuery] = useState(value?.label || '');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (value?.label) setQuery(value.label);
  }, [value?.label]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
  }, []);

  const runSearch = (text) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    const trimmed = text.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setSearching(false);
      setSearchError('');
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setSearching(true);
      setSearchError('');
      try {
        const results = await searchPlaces(trimmed, { signal: controller.signal });
        setSuggestions(results);
        setOpen(true);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setSuggestions([]);
        setSearchError(err.message || 'Could not search addresses.');
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, DEBOUNCE_MS);
  };

  const handleInputChange = (e) => {
    const next = e.target.value;
    setQuery(next);
    if (value) onChange(null);
    runSearch(next);
    setOpen(true);
  };

  const handleSelect = (place) => {
    onChange(place);
    setQuery(place.label);
    setSuggestions([]);
    setOpen(false);
    setSearchError('');
  };

  const handleClearSelection = () => {
    onChange(null);
    setQuery('');
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={styles.wrapper}>
      {value ? (
        <div style={styles.selected}>
          <Check size={16} color="#2E7D32" />
          <span style={styles.selectedText}>{value.label}</span>
          {!disabled && (
            <button type="button" style={styles.changeBtn} onClick={handleClearSelection}>
              Change
            </button>
          )}
        </div>
      ) : (
        <div style={styles.inputWrapper}>
          <Search size={18} color="#888" />
          <input
            type="text"
            style={styles.input}
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (suggestions.length) setOpen(true);
            }}
            placeholder={placeholder || 'Search street, building, or landmark…'}
            disabled={disabled}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={open && suggestions.length > 0}
          />
          {searching && <Loader size={18} color="#888" />}
        </div>
      )}

      {searchError && <p style={styles.error}>{searchError}</p>}

      {open && suggestions.length > 0 && !value && (
        <ul style={styles.list} role="listbox">
          {suggestions.map((place) => (
            <li key={place.placeId}>
              <button
                type="button"
                style={styles.option}
                role="option"
                onClick={() => handleSelect(place)}
              >
                <MapPin size={16} color="#0033FF" style={{ flexShrink: 0 }} />
                <span style={styles.optionLabel}>{place.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!value && query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH && (
        <p style={styles.hint}>Type at least {MIN_QUERY_LENGTH} characters to search.</p>
      )}

      <LocationMapPreview value={value} onChange={onChange} disabled={disabled} />

      <p style={styles.attribution}>
        Address search powered by{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap
        </a>
      </p>
    </div>
  );
};

const styles = {
  wrapper: { position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '0.85rem 1rem',
    backgroundColor: '#FFF',
  },
  input: {
    border: 'none',
    outline: 'none',
    flex: 1,
    fontSize: '0.95rem',
    fontFamily: 'var(--font-primary)',
    color: '#111',
    backgroundColor: 'transparent',
  },
  selected: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    padding: '0.65rem 0.85rem',
    backgroundColor: '#E8F5E9',
    border: '1px solid #C8E6C9',
    borderRadius: '8px',
    fontSize: '0.85rem',
    color: '#1B5E20',
  },
  selectedText: { flex: 1, lineHeight: 1.4 },
  changeBtn: {
    background: 'none',
    border: 'none',
    color: '#0033FF',
    fontWeight: 600,
    fontSize: '0.8rem',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    backgroundColor: '#FFF',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    maxHeight: '220px',
    overflowY: 'auto',
    zIndex: 10,
  },
  option: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.65rem',
    width: '100%',
    padding: '0.75rem 1rem',
    border: 'none',
    borderBottom: '1px solid #F0F0F0',
    backgroundColor: '#FFF',
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'var(--font-primary)',
    fontSize: '0.85rem',
    color: '#333',
  },
  optionLabel: { lineHeight: 1.35 },
  hint: { margin: 0, fontSize: '0.8rem', color: '#888' },
  error: { margin: 0, fontSize: '0.8rem', color: '#C62828' },
  attribution: { margin: 0, fontSize: '0.7rem', color: '#999' },
};

export default CustomLocationPicker;
