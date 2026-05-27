/** Default SLA: respond within 30 minutes, resolve within 4 hours. */
export const ROADSIDE_RESPONSE_MINUTES = 30;
export const ROADSIDE_RESOLVE_HOURS = 4;

export const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

export const addHours = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000);

export const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value?.toDate) return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const getRoadsideSlaDue = (createdAt) => {
  const created = toDate(createdAt);
  if (!created) return { respondBy: null, resolveBy: null };
  return {
    respondBy: addMinutes(created, ROADSIDE_RESPONSE_MINUTES),
    resolveBy: addHours(created, ROADSIDE_RESOLVE_HOURS),
  };
};

export const getSlaStatus = (item, now = new Date()) => {
  if (item.status === 'Resolved') return { level: 'ok', label: 'Resolved' };
  const respondBy = toDate(item.slaRespondBy || item.respondBy);
  const resolveBy = toDate(item.slaResolveBy || item.resolveBy);
  if (item.status === 'Dispatched') {
    if (resolveBy && now > resolveBy) return { level: 'breach', label: 'Resolve overdue' };
    return { level: 'ok', label: 'Dispatched' };
  }
  if (respondBy && now > respondBy) return { level: 'breach', label: 'Response overdue' };
  if (respondBy && now > addMinutes(respondBy, -10)) return { level: 'warn', label: 'Due soon' };
  return { level: 'ok', label: 'On track' };
};

/** SLA fields on doc, or computed from createdAt for legacy requests. */
export const getEffectiveRoadsideSla = (item) => {
  const respondBy = item?.slaRespondBy ?? item?.respondBy;
  const resolveBy = item?.slaResolveBy ?? item?.resolveBy;
  if (respondBy || resolveBy) {
    return { respondBy, resolveBy };
  }
  return getRoadsideSlaDue(item?.createdAt);
};

export const formatSlaCountdown = (deadline, now = new Date()) => {
  const due = toDate(deadline);
  if (!due) return '—';
  const diffMs = due.getTime() - now.getTime();
  const absM = Math.round(Math.abs(diffMs) / 60000);
  if (diffMs < 0) return `${absM}m overdue`;
  if (absM < 60) return `${absM}m left`;
  const h = Math.floor(absM / 60);
  const m = absM % 60;
  return `${h}h ${m}m left`;
};
