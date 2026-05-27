import { useLocation } from 'react-router-dom';

/** Detect which staff portal shell is active from the URL. */
export const useStaffPortal = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith('/support')) return 'support';
  if (pathname.startsWith('/workshop')) return 'workshop';
  if (pathname.startsWith('/driver')) return 'driver';
  if (pathname.startsWith('/admin')) return 'admin';
  return null;
};

export const staffIncidentsLink = (portal) => {
  if (portal === 'support') return '/support/incidents';
  if (portal === 'workshop') return '/workshop/incidents';
  return '/admin/incidents';
};
