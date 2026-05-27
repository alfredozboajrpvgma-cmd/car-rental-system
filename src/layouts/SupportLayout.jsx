import React from 'react';
import {
  LayoutDashboard, CalendarCheck, Users, AlertTriangle, User, MapPin, HelpCircle,
} from 'lucide-react';
import StaffPortalLayout from '../components/StaffPortalLayout';
import { SUPPORT_THEME } from '../utils/staffPortalThemes';

const navItems = [
  { name: 'Dashboard', path: '/support', icon: <LayoutDashboard size={20} /> },
  { name: 'Reservations', path: '/support/reservations', icon: <CalendarCheck size={20} /> },
  { name: 'Customers', path: '/support/customers', icon: <Users size={20} /> },
  { name: 'Incidents & Roadside', path: '/support/incidents', icon: <AlertTriangle size={20} /> },
  { name: 'Hub Locations', path: '/support/locations', icon: <MapPin size={20} /> },
  { name: 'FAQ & playbook', path: '/support/faq', icon: <HelpCircle size={20} /> },
  { name: 'My Profile', path: '/support/profile', icon: <User size={20} /> },
];

const SupportLayout = () => (
  <StaffPortalLayout
    portalTag="Contact & Support"
    theme={SUPPORT_THEME}
    navItems={navItems}
    defaultNotificationLink="/support/reservations"
  />
);

export default SupportLayout;
