import React from 'react';
import {
  LayoutDashboard, Car, Wrench, AlertTriangle, User, MapPin,
} from 'lucide-react';
import StaffPortalLayout from '../components/StaffPortalLayout';
import { WORKSHOP_THEME } from '../utils/staffPortalThemes';

const navItems = [
  { name: 'Dashboard', path: '/workshop', icon: <LayoutDashboard size={20} /> },
  { name: 'Fleet Status', path: '/workshop/fleet', icon: <Car size={20} /> },
  { name: 'Maintenance Tasks', path: '/workshop/tasks', icon: <Wrench size={20} /> },
  { name: 'Vehicle Incidents', path: '/workshop/incidents', icon: <AlertTriangle size={20} /> },
  { name: 'Hub Locations', path: '/workshop/locations', icon: <MapPin size={20} /> },
  { name: 'My Profile', path: '/workshop/profile', icon: <User size={20} /> },
];

const WorkshopLayout = () => (
  <StaffPortalLayout
    portalTag="Maintenance"
    theme={WORKSHOP_THEME}
    navItems={navItems}
    defaultNotificationLink="/workshop/tasks"
  />
);

export default WorkshopLayout;
