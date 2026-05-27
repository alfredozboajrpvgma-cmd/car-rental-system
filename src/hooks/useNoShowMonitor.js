import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { processAutoNoShows } from '../utils/noShow';

/** Runs no-show checks every minute when staff/admin is signed in. */
export const useNoShowMonitor = () => {
  const { currentUser } = useAuth();
  const isOps = currentUser?.role === 'admin'
    || (currentUser?.role === 'staff' && currentUser?.staffType === 'support');

  useEffect(() => {
    if (!isOps) return undefined;

    const run = () => {
      processAutoNoShows().catch((err) => console.error('No-show check failed:', err));
    };

    run();
    const intervalId = setInterval(run, 60 * 1000);
    const onFocus = () => run();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [isOps, currentUser?.id]);
};
