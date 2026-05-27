import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const RECEIPT_ELIGIBLE_STATUSES = ['Approved', 'Active', 'Completed'];

export const canGenerateReceipt = (status) => RECEIPT_ELIGIBLE_STATUSES.includes(status);

const DEFAULT_BUSINESS = {
  businessName: 'Drive PH Car Rentals',
  businessAddress: 'Metro Manila, Philippines',
  contactEmail: 'info@driveph.com',
  hotline: '+63 2 8888 0000',
  registrationNo: '',
  tin: '',
};

const parseDays = (days) => {
  if (typeof days === 'number' && !Number.isNaN(days)) return days;
  if (typeof days === 'string') {
    const match = days.match(/(\d+)/);
    return match ? Number(match[1]) : null;
  }
  return null;
};

export const normalizeBookingForReceipt = (booking) => {
  const rawId = booking.id || booking.docId || '';
  const displayId = String(rawId).startsWith('#')
    ? String(rawId)
    : `#${String(rawId).slice(0, 8).toUpperCase()}`;

  const dayCount = parseDays(booking.days);
  const total = Number(booking.total) || 0;
  const dailyRate = dayCount && dayCount > 0 ? Math.round(total / dayCount) : null;

  return {
    id: displayId,
    docId: booking.docId || '',
    customerName: booking.customerName || 'Customer',
    customerEmail: booking.customerEmail || '',
    vehicleName: booking.vehicleName || booking.vehicle || '—',
    plate: booking.plate || '—',
    dateRange: booking.dateRange || booking.date || '—',
    location: booking.location || '—',
    status: booking.status || '—',
    total,
    days: dayCount,
    dailyRate,
    daysLabel: booking.daysLabel || (dayCount ? `${dayCount} day${dayCount > 1 ? 's' : ''}` : '—'),
  };
};

export const fetchReceiptBusinessSettings = async () => {
  try {
    const snap = await getDoc(doc(db, 'settings', 'app'));
    if (snap.exists()) {
      return { ...DEFAULT_BUSINESS, ...snap.data() };
    }
  } catch (err) {
    console.warn('Could not load receipt business settings', err);
  }
  return DEFAULT_BUSINESS;
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const buildReceiptHtml = (booking, business = DEFAULT_BUSINESS) => {
  const issuedAt = new Date().toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const lineItems = booking.dailyRate && booking.days
    ? `<tr>
        <td>Rental (${escapeHtml(booking.daysLabel)})</td>
        <td>₱${booking.dailyRate.toLocaleString()} × ${booking.days}</td>
        <td>₱${booking.total.toLocaleString()}</td>
      </tr>`
    : `<tr>
        <td>Rental charges</td>
        <td>${escapeHtml(booking.dateRange)}</td>
        <td>₱${booking.total.toLocaleString()}</td>
      </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt ${escapeHtml(booking.id)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      padding: 40px;
      color: #111;
      max-width: 640px;
      margin: 0 auto;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;
      margin-bottom: 2rem;
      padding-bottom: 1.25rem;
      border-bottom: 2px solid #0033FF;
    }
    .brand { font-size: 1.35rem; font-weight: 700; color: #0033FF; margin: 0 0 0.35rem; }
    .brand-meta { font-size: 0.85rem; color: #555; margin: 0.15rem 0; }
    .receipt-meta { text-align: right; font-size: 0.85rem; color: #444; }
    .receipt-meta strong { display: block; font-size: 1rem; color: #111; margin-bottom: 0.25rem; }
    h2 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin: 1.5rem 0 0.5rem; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem 1.5rem; font-size: 0.9rem; }
    .info-grid dt { color: #666; margin: 0; }
    .info-grid dd { margin: 0; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; font-size: 0.9rem; }
    th { text-align: left; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: #888; padding: 0.5rem 0; border-bottom: 1px solid #E0E0E0; }
    th:last-child, td:last-child { text-align: right; }
    td { padding: 0.65rem 0; border-bottom: 1px solid #F0F0F0; vertical-align: top; }
    .total-row td { border-bottom: none; padding-top: 1rem; font-size: 1.15rem; font-weight: 700; }
    .status {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      background: #E8F5E9;
      color: #2E7D32;
    }
    .footer { margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid #E0E0E0; font-size: 0.8rem; color: #888; }
    @media print {
      body { padding: 24px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <p class="brand">${escapeHtml(business.businessName)}</p>
      ${business.businessAddress ? `<p class="brand-meta">${escapeHtml(business.businessAddress)}</p>` : ''}
      <p class="brand-meta">${escapeHtml(business.contactEmail)}</p>
      <p class="brand-meta">${escapeHtml(business.hotline)}</p>
      ${business.tin ? `<p class="brand-meta">TIN: ${escapeHtml(business.tin)}</p>` : ''}
    </div>
    <div class="receipt-meta">
      <strong>OFFICIAL RECEIPT</strong>
      <div>Booking ${escapeHtml(booking.id)}</div>
      <div>Issued ${escapeHtml(issuedAt)}</div>
    </div>
  </div>

  <h2>Bill to</h2>
  <dl class="info-grid">
    <dt>Customer</dt><dd>${escapeHtml(booking.customerName)}</dd>
    ${booking.customerEmail ? `<dt>Email</dt><dd>${escapeHtml(booking.customerEmail)}</dd>` : ''}
    <dt>Status</dt><dd><span class="status">${escapeHtml(booking.status)}</span></dd>
  </dl>

  <h2>Rental details</h2>
  <dl class="info-grid">
    <dt>Vehicle</dt><dd>${escapeHtml(booking.vehicleName)}</dd>
    <dt>Plate</dt><dd>${escapeHtml(booking.plate)}</dd>
    <dt>Period</dt><dd>${escapeHtml(booking.dateRange)}</dd>
    <dt>Pickup hub</dt><dd>${escapeHtml(booking.location)}</dd>
  </dl>

  <h2>Charges</h2>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Details</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItems}
      <tr class="total-row">
        <td colspan="2">Total due</td>
        <td>₱${booking.total.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <p class="footer">
    Thank you for renting with ${escapeHtml(business.businessName)}.
    This document was generated electronically and is valid without signature.
    ${business.registrationNo ? ` Reg. No. ${escapeHtml(business.registrationNo)}.` : ''}
  </p>
  <p class="footer no-print">Use your browser&apos;s Print → Save as PDF to keep a PDF copy.</p>
</body>
</html>`;
};

const triggerHtmlDownload = (html, filename) => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const downloadBookingReceipt = async (booking) => {
  const normalized = normalizeBookingForReceipt(booking);
  const business = await fetchReceiptBusinessSettings();
  const html = buildReceiptHtml(normalized, business);
  const safeId = normalized.id.replace(/#/g, '');
  triggerHtmlDownload(html, `receipt-${safeId}.html`);
};

export const printBookingReceipt = async (booking) => {
  const normalized = normalizeBookingForReceipt(booking);
  const business = await fetchReceiptBusinessSettings();
  const html = buildReceiptHtml(normalized, business);
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    await downloadBookingReceipt(booking);
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
};
