import React, { useState } from 'react';
import { HelpCircle, ChevronDown, PhoneCall } from 'lucide-react';
import { SUPPORT_THEME } from '../../utils/staffPortalThemes';

const FAQ_SECTIONS = [
  {
    title: 'Reservations & bookings',
    items: [
      {
        q: 'When can I approve a pending booking?',
        a: 'Confirm vehicle availability, payment method, and customer ID. Approve only when pickup window and hub assignment are correct.',
      },
      {
        q: 'How do I handle a customer no-show?',
        a: 'Mark the booking as No-Show from Reservations after the grace period. Notify the customer via their booking details if contact is on file.',
      },
      {
        q: 'Can support change rental mode (self-drive vs chauffeur)?',
        a: 'Escalate to admin dispatch. Support can view mode on the reservation but major changes are admin-only.',
      },
    ],
  },
  {
    title: 'Roadside & incidents',
    items: [
      {
        q: 'What is the roadside SLA?',
        a: 'Respond within 30 minutes and resolve within 4 hours from report time. Overdue items show a red SLA badge on the dashboard and Incidents page.',
      },
      {
        q: 'Open vs Dispatched roadside status?',
        a: 'Open = new request. Mark Dispatched when a provider or tow is en route. Resolve when the customer is safe and the vehicle is handled.',
      },
      {
        q: 'When do I log a formal incident?',
        a: 'Use Log New Incident for damage, collisions, or mechanical issues that need repair tracking. Link the booking ID when possible.',
      },
    ],
  },
  {
    title: 'Customers & payments',
    items: [
      {
        q: 'Customer cannot log in',
        a: 'Verify email in Customers. Ask them to reset password on the login page. If role is wrong, escalate to admin to fix Firestore user role.',
      },
      {
        q: 'Marking payment received',
        a: 'Admin can mark paid on Reservations. Support can confirm with customer and note the booking; request admin to update payment status if needed.',
      },
    ],
  },
];

const SupportFaq = () => {
  const [openKey, setOpenKey] = useState(null);
  const theme = SUPPORT_THEME;

  const toggle = (key) => setOpenKey((prev) => (prev === key ? null : key));

  return (
    <div className="fade-in">
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '0.35rem' }}>
          Support playbook & FAQ
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          Quick answers for Contact & Support staff. Escalate edge cases to admin dispatch.
        </p>
      </header>

      <div style={{
        background: theme.primaryBg,
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '2rem',
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-start',
      }}
      >
        <PhoneCall size={22} color={theme.primaryHex} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
        <div>
          <strong style={{ color: theme.primaryHex }}>Roadside hotline</strong>
          <p style={{ margin: '0.35rem 0 0', color: '#444', fontSize: '0.9rem' }}>
            Use the number in Admin → Settings → Business. Customers see the same hotline in the app during active rentals.
          </p>
        </div>
      </div>

      {FAQ_SECTIONS.map((section) => (
        <section key={section.title} style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
          >
            <HelpCircle size={20} color={theme.primaryHex} />
            {section.title}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {section.items.map((item, idx) => {
              const key = `${section.title}-${idx}`;
              const open = openKey === key;
              return (
                <div
                  key={key}
                  style={{
                    background: '#FFF',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                    }}
                  >
                    {item.q}
                    <ChevronDown
                      size={18}
                      style={{
                        flexShrink: 0,
                        transform: open ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                        color: '#888',
                      }}
                    />
                  </button>
                  {open && (
                    <p style={{
                      margin: 0,
                      padding: '0 1.25rem 1rem',
                      color: '#555',
                      fontSize: '0.9rem',
                      lineHeight: 1.55,
                    }}
                    >
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

export default SupportFaq;
