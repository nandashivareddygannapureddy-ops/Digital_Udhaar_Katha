import { useEffect } from 'react';

export const useSocketSync = (callback, types = []) => {
  useEffect(() => {
    const handleRefresh = (event) => {
      const { type } = event.detail;
      // If no specific types are listed, refresh on all. Otherwise, refresh only if type matches.
      if (types.length === 0 || types.includes(type)) {
        console.log(`Socket triggered refresh for type: ${type}`);
        callback(type);
      }
    };

    window.addEventListener('socket_refresh', handleRefresh);

    return () => {
      window.removeEventListener('socket_refresh', handleRefresh);
    };
  }, [callback, types]);
};
