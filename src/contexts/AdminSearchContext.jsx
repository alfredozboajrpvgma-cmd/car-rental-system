import React, { createContext, useContext, useMemo, useState } from 'react';

const AdminSearchContext = createContext(null);

export const AdminSearchProvider = ({ children }) => {
  const [query, setQuery] = useState('');

  const value = useMemo(
    () => ({
      query,
      setQuery,
      clear: () => setQuery(''),
    }),
    [query]
  );

  return (
    <AdminSearchContext.Provider value={value}>
      {children}
    </AdminSearchContext.Provider>
  );
};

const noopSearch = {
  query: '',
  setQuery: () => {},
  clear: () => {},
};

/** Safe on support/workshop routes that reuse admin pages without the header search bar. */
export const useAdminSearch = () => {
  const ctx = useContext(AdminSearchContext);
  return ctx ?? noopSearch;
};

