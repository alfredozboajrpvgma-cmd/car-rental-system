import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const DEFAULTS = {
  peakMultiplier: 1.5,
  offPeakMultiplier: 0.9,
  longTermDays: 7,
  longTermDiscount: 15,
};

const parseMultiplier = (value, fallback) => {
  if (value == null) return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const s = String(value).trim().toLowerCase();
  // accepts: "1.5", "1.5x", "x1.5", "150%"
  const pct = s.endsWith('%') ? Number(s.slice(0, -1)) : NaN;
  if (Number.isFinite(pct)) return pct / 100;
  const num = Number(s.replace(/x/g, '').replace(/^x/, ''));
  return Number.isFinite(num) ? num : fallback;
};

export const loadPricingSettings = async () => {
  try {
    const snap = await getDoc(doc(db, 'settings', 'app'));
    const data = snap.data() || {};
    return {
      peakMultiplier: parseMultiplier(data.peakMultiplier, DEFAULTS.peakMultiplier),
      offPeakMultiplier: parseMultiplier(data.offPeakMultiplier, DEFAULTS.offPeakMultiplier),
      longTermDays: Number.isFinite(Number(data.longTermDays)) ? Number(data.longTermDays) : DEFAULTS.longTermDays,
      longTermDiscount: Number.isFinite(Number(data.longTermDiscount)) ? Number(data.longTermDiscount) : DEFAULTS.longTermDiscount,
    };
  } catch {
    return { ...DEFAULTS };
  }
};

// Simple PH-focused heuristic; override later if you add a real “season calendar”.
export const isPeakSeasonDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const m = d.getMonth(); // 0-11
  // Dec/Jan + Mar/Apr (often overlaps Holy Week travel)
  return m === 11 || m === 0 || m === 2 || m === 3;
};

/** Fleet list price from Firestore `vehicles/{id}.price`. */
export const fetchVehicleDailyRate = async (vehicleId) => {
  if (!vehicleId) return null;
  try {
    const snap = await getDoc(doc(db, 'vehicles', vehicleId));
    if (!snap.exists()) return null;
    const price = Number(snap.data()?.price);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch (err) {
    console.warn('Could not load vehicle daily rate:', err);
    return null;
  }
};

export const calculateBookingTotal = async ({ baseDailyRate, days, pickupDate }) => {
  const pricing = await loadPricingSettings();
  const base = Math.max(0, Number(baseDailyRate) || 0) * Math.max(1, Number(days) || 1);

  const peak = isPeakSeasonDate(pickupDate);
  const multiplier = peak ? pricing.peakMultiplier : pricing.offPeakMultiplier;
  const subtotal = base * multiplier;

  const isLongTerm = Number(days) >= pricing.longTermDays;
  const discountPct = isLongTerm ? pricing.longTermDiscount : 0;
  const discount = subtotal * (Math.max(0, discountPct) / 100);

  return {
    total: Math.round(Math.max(0, subtotal - discount)),
    breakdown: {
      base,
      multiplier,
      peak,
      longTermDays: pricing.longTermDays,
      longTermDiscount: discountPct,
      discount,
      subtotal,
    },
  };
};

