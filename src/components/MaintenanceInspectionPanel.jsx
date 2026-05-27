import React from 'react';
import { parseChecklist, checklistProgress } from '../utils/maintenanceChecklist';

/**
 * Pre-return / in-shop inspection checklist stored on maintenance task docs.
 */
const MaintenanceInspectionPanel = ({ items, onChange, compact = false }) => {
  const list = parseChecklist(items);
  const { done, total, percent } = checklistProgress(list);

  const toggle = (id) => {
    const next = list.map((item) => (
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
    onChange(next);
  };

  return (
    <div style={{ marginTop: compact ? '0.5rem' : '0.75rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.5rem',
        fontSize: '0.8rem',
      }}
      >
        <span style={{ fontWeight: 600, color: '#444' }}>Inspection checklist</span>
        <span style={{ color: '#666' }}>{done}/{total} ({percent}%)</span>
      </div>
      <div style={{
        height: '4px',
        backgroundColor: '#E8E8E8',
        borderRadius: '2px',
        marginBottom: '0.65rem',
        overflow: 'hidden',
      }}
      >
        <div style={{
          width: `${percent}%`,
          height: '100%',
          backgroundColor: percent === 100 ? '#2E7D32' : '#F57F17',
          transition: 'width 0.2s',
        }}
        />
      </div>
      <ul style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
      }}
      >
        {list.map((item) => (
          <li key={item.id}>
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              fontSize: '0.8rem',
              color: item.checked ? '#888' : '#333',
              textDecoration: item.checked ? 'line-through' : 'none',
              cursor: 'pointer',
            }}
            >
              <input
                type="checkbox"
                checked={Boolean(item.checked)}
                onChange={() => toggle(item.id)}
                style={{ marginTop: '0.15rem' }}
              />
              <span>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MaintenanceInspectionPanel;
