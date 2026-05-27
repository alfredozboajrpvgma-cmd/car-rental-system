import React from 'react';
import { getEffectiveRoadsideSla, getSlaStatus, formatSlaCountdown } from '../utils/sla';

const LEVEL_STYLES = {
  ok: { bg: '#E8F5E9', color: '#2E7D32' },
  warn: { bg: '#FFF8E1', color: '#F57F17' },
  breach: { bg: '#FFEBEE', color: '#C62828' },
};

/**
 * Roadside assistance SLA pill with optional countdown to respond-by deadline.
 */
const SlaBadge = ({ request, showCountdown = true }) => {
  const sla = getEffectiveRoadsideSla(request);
  const enriched = {
    ...request,
    slaRespondBy: sla.respondBy,
    slaResolveBy: sla.resolveBy,
  };
  const { level, label } = getSlaStatus(enriched);
  const style = LEVEL_STYLES[level] || LEVEL_STYLES.ok;
  const countdown = request.status === 'Open' && showCountdown
    ? formatSlaCountdown(sla.respondBy)
    : request.status === 'Dispatched' && showCountdown
      ? formatSlaCountdown(sla.resolveBy)
      : null;

  return (
    <span style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '0.15rem',
    }}
    >
      <span style={{
        fontSize: '0.72rem',
        fontWeight: 700,
        padding: '0.2rem 0.5rem',
        borderRadius: '4px',
        backgroundColor: style.bg,
        color: style.color,
      }}
      >
        {label}
      </span>
      {countdown && countdown !== '—' && (
        <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: 500 }}>{countdown}</span>
      )}
    </span>
  );
};

export default SlaBadge;
