import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Login = lazy(() => import('./pages/Login'));
const CustomerLayout = lazy(() => import('./layouts/CustomerLayout'));
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'));
const CustomerFleet = lazy(() => import('./pages/customer/CustomerFleet'));
const CustomerBookings = lazy(() => import('./pages/customer/CustomerBookings'));
const CustomerProfile = lazy(() => import('./pages/customer/CustomerProfile'));
const CustomerIncidents = lazy(() => import('./pages/customer/CustomerIncidents'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const FleetManagement = lazy(() => import('./pages/admin/FleetManagement'));
const Reservations = lazy(() => import('./pages/admin/Reservations'));
const Customers = lazy(() => import('./pages/admin/Customers'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const Drivers = lazy(() => import('./pages/admin/Drivers'));
const Locations = lazy(() => import('./pages/admin/Locations'));
const Incidents = lazy(() => import('./pages/admin/Incidents'));
const Maintenance = lazy(() => import('./pages/admin/Maintenance'));
const DriverLayout = lazy(() => import('./layouts/DriverLayout'));
const DriverDashboard = lazy(() => import('./pages/driver/DriverDashboard'));
const DriverTrips = lazy(() => import('./pages/driver/DriverTrips'));
const DriverTripDetail = lazy(() => import('./pages/driver/DriverTripDetail'));
const DriverProfile = lazy(() => import('./pages/driver/DriverProfile'));
const SupportLayout = lazy(() => import('./layouts/SupportLayout'));
const SupportDashboard = lazy(() => import('./pages/support/SupportDashboard'));
const SupportProfile = lazy(() => import('./pages/support/SupportProfile'));
const SupportFaq = lazy(() => import('./pages/support/SupportFaq'));
const WorkshopLayout = lazy(() => import('./layouts/WorkshopLayout'));
const WorkshopDashboard = lazy(() => import('./pages/workshop/WorkshopDashboard'));
const WorkshopProfile = lazy(() => import('./pages/workshop/WorkshopProfile'));

const PageLoader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '40vh',
    color: '#888',
    fontSize: '0.95rem',
  }}
  >
    Loading…
  </div>
);

const PublicLayout = () => (
  <>
    <Navbar />
    <main style={{ minHeight: '100vh' }}>
      <Outlet />
    </main>
    <Footer />
  </>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Login />} />
            </Route>

            {/* Customer Protected Routes */}
            <Route path="/customer" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerLayout />
              </ProtectedRoute>
            }
            >
              <Route index element={<CustomerDashboard />} />
              <Route path="fleet" element={<CustomerFleet />} />
              <Route path="bookings" element={<CustomerBookings />} />
              <Route path="profile" element={<CustomerProfile />} />
              <Route path="incidents" element={<CustomerIncidents />} />
            </Route>

            {/* Driver portal — chauffeurs only */}
            <Route path="/driver" element={
              <ProtectedRoute requireDriverPortal>
                <DriverLayout />
              </ProtectedRoute>
            }
            >
              <Route index element={<DriverDashboard />} />
              <Route path="trips" element={<DriverTrips />} />
              <Route path="trips/:tripId" element={<DriverTripDetail />} />
              <Route path="profile" element={<DriverProfile />} />
            </Route>

            {/* Contact & Support portal */}
            <Route path="/support" element={
              <ProtectedRoute requireSupportPortal>
                <SupportLayout />
              </ProtectedRoute>
            }
            >
              <Route index element={<SupportDashboard />} />
              <Route path="reservations" element={<Reservations />} />
              <Route path="customers" element={<Customers />} />
              <Route path="incidents" element={<Incidents />} />
              <Route path="locations" element={<Locations />} />
              <Route path="faq" element={<SupportFaq />} />
              <Route path="profile" element={<SupportProfile />} />
            </Route>

            {/* Maintenance / workshop portal */}
            <Route path="/workshop" element={
              <ProtectedRoute requireWorkshopPortal>
                <WorkshopLayout />
              </ProtectedRoute>
            }
            >
              <Route index element={<WorkshopDashboard />} />
              <Route path="fleet" element={<FleetManagement />} />
              <Route path="tasks" element={<Maintenance />} />
              <Route path="incidents" element={<Incidents />} />
              <Route path="locations" element={<Locations />} />
              <Route path="profile" element={<WorkshopProfile />} />
            </Route>

            {/* Admin portal — administrators only */}
            <Route path="/admin" element={
              <ProtectedRoute requireAdminPanel>
                <AdminLayout />
              </ProtectedRoute>
            }
            >
              <Route index element={<Dashboard />} />
              <Route path="fleet" element={<FleetManagement />} />
              <Route path="reservations" element={<Reservations />} />
              <Route path="customers" element={<Customers />} />
              <Route path="staff" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Navigate to="/admin/staff/drivers" replace />
                </ProtectedRoute>
              }
              />
              <Route path="staff/drivers" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Drivers />
                </ProtectedRoute>
              }
              />
              <Route path="staff/support" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Drivers />
                </ProtectedRoute>
              }
              />
              <Route path="staff/maintenance" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Drivers />
                </ProtectedRoute>
              }
              />
              <Route path="drivers" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Navigate to="/admin/staff/drivers" replace />
                </ProtectedRoute>
              }
              />
              <Route path="locations" element={<Locations />} />
              <Route path="incidents" element={<Incidents />} />
              <Route path="maintenance" element={<Maintenance />} />

              {/* Strict Admin-Only Routes */}
              <Route path="reports" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Reports />
                </ProtectedRoute>
              }
              />
              <Route path="settings" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Settings />
                </ProtectedRoute>
              }
              />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
