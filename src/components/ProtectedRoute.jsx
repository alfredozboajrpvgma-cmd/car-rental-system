import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardPath } from '../utils/userProfile';
import {
  canAccessAdminPanel,
  canAccessDriverPortal,
  canAccessSupportPortal,
  canAccessWorkshopPortal,
  canSupportAccessPath,
  canWorkshopAccessPath,
  userHasRole,
} from '../utils/roles';

const ProtectedRoute = ({
  allowedRoles,
  requireAdminPanel,
  requireDriverPortal,
  requireSupportPortal,
  requireWorkshopPortal,
  children,
}) => {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requireDriverPortal && !canAccessDriverPortal(currentUser)) {
    return <Navigate to={getDashboardPath(currentUser)} replace />;
  }

  if (requireSupportPortal && !canAccessSupportPortal(currentUser)) {
    return <Navigate to={getDashboardPath(currentUser)} replace />;
  }

  if (requireWorkshopPortal && !canAccessWorkshopPortal(currentUser)) {
    return <Navigate to={getDashboardPath(currentUser)} replace />;
  }

  if (requireAdminPanel && !canAccessAdminPanel(currentUser)) {
    return <Navigate to={getDashboardPath(currentUser)} replace />;
  }

  if (allowedRoles && !userHasRole(currentUser, allowedRoles)) {
    return <Navigate to={getDashboardPath(currentUser)} replace />;
  }

  if (requireSupportPortal && !canSupportAccessPath(currentUser, location.pathname)) {
    return <Navigate to="/support" replace />;
  }

  if (requireWorkshopPortal && !canWorkshopAccessPath(currentUser, location.pathname)) {
    return <Navigate to="/workshop" replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
