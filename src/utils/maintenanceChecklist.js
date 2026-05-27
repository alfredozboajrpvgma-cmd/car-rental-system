export const DEFAULT_INSPECTION_ITEMS = [
  { id: 'exterior', label: 'Exterior walk-around (dents, scratches)' },
  { id: 'tires', label: 'Tire tread & pressure' },
  { id: 'fluids', label: 'Engine oil & coolant levels' },
  { id: 'brakes', label: 'Brake test' },
  { id: 'lights', label: 'Headlights, signals, brake lights' },
  { id: 'interior', label: 'Interior cleanliness' },
  { id: 'documents', label: 'OR/CR & registration in glove box' },
];

export const emptyChecklistState = () =>
  DEFAULT_INSPECTION_ITEMS.map((item) => ({ ...item, checked: false }));

export const parseChecklist = (raw) => {
  if (Array.isArray(raw) && raw.length) return raw;
  return emptyChecklistState();
};

export const checklistProgress = (items) => {
  const list = parseChecklist(items);
  const done = list.filter((i) => i.checked).length;
  return { done, total: list.length, percent: list.length ? Math.round((done / list.length) * 100) : 0 };
};
