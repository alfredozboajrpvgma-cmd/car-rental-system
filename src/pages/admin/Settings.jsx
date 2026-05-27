import React, { useState, useEffect } from 'react';
import { User, Building, CreditCard, Bell, Save } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { seedInitialData } from '../../utils/seedData';

const tabs = [
  { name: 'Account', icon: <User size={18} /> },
  { name: 'Business', icon: <Building size={18} /> },
  { name: 'Pricing', icon: <CreditCard size={18} /> },
  { name: 'Notifications', icon: <Bell size={18} /> },
];

const NOTIFICATION_PREFS = [
  {
    key: 'notifyNewBooking',
    title: 'New Booking Alert',
    desc: 'Receive a notification when a customer submits a new reservation.',
  },
  {
    key: 'notifyPaymentReceived',
    title: 'Payment Received',
    desc: 'Get notified when a payment is successfully processed.',
  },
  {
    key: 'notifyReturnReminder',
    title: 'Vehicle Return Reminder',
    desc: 'Alert 2 hours before a scheduled vehicle return.',
  },
  {
    key: 'notifyMaintenanceDue',
    title: 'Maintenance Due',
    desc: 'Notify when a vehicle reaches its scheduled maintenance mileage.',
  },
  {
    key: 'notifyLowFleetAvailability',
    title: 'Low Fleet Availability',
    desc: 'Alert when less than 3 vehicles are available for rent.',
  },
];

const Toggle = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    style={{
      ...styles.switch,
      backgroundColor: checked ? '#111' : '#CCC',
      justifyContent: checked ? 'flex-end' : 'flex-start',
    }}
  >
    <span style={styles.switchKnob} />
  </button>
);

const Settings = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('Business');
  const [settings, setSettings] = useState({
    businessName: 'Drive PH Car Rentals',
    registrationNo: '',
    tin: '',
    businessAddress: '',
    contactEmail: 'info@driveph.com',
    hotline: '+63 2 8888 0000',
    roadsideHotline: '+63 917 888 0000',
    peakMultiplier: '1.5x',
    offPeakMultiplier: '0.9x',
    longTermDays: 7,
    longTermDiscount: 15,
    notifyNewBooking: true,
    notifyPaymentReceived: true,
    notifyReturnReminder: false,
    notifyMaintenanceDue: true,
    notifyLowFleetAvailability: false,
  });
  const [saved, setSaved] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'app')).then((snap) => {
      if (snap.exists()) setSettings((prev) => ({ ...prev, ...snap.data() }));
    });
  }, []);

  const saveSettings = async () => {
    await setDoc(doc(db, 'settings', 'app'), settings, { merge: true });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedInitialData();
      alert('Seed complete: vehicles, locations, and drivers.');
    } catch (e) {
      alert('Seed failed. Check console and Firestore rules.');
      console.error(e);
    }
    setSeeding(false);
  };

  const toggleNotificationPref = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fade-in">
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Settings</h1>
      </div>

      <div style={styles.layout}>
        {/* Settings Tabs */}
        <div style={styles.tabSidebar}>
          {tabs.map(tab => (
            <button
              key={tab.name}
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab.name ? styles.tabBtnActive : {})
              }}
              onClick={() => setActiveTab(tab.name)}
            >
              {tab.icon}
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div style={styles.contentArea}>
          {activeTab === 'Account' && (
            <div className="fade-in">
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Account Settings</h2>
                <p style={styles.sectionDesc}>Manage your admin profile and security preferences.</p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name</label>
                <input type="text" defaultValue="Admin Drive PH" style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address</label>
                <input type="email" defaultValue="admin@driveph.com" style={styles.input} />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input type="text" defaultValue="+63 917 000 0000" style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Role</label>
                  <input type="text" defaultValue="Super Admin" style={styles.input} disabled />
                </div>
              </div>

              <div style={styles.divider}></div>
              <div style={styles.sectionHeader}>
                <h3 style={styles.subTitle}>Security</h3>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Current Password</label>
                  <input type="password" placeholder="••••••••" style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>New Password</label>
                  <input type="password" placeholder="••••••••" style={styles.input} />
                </div>
              </div>
              <div style={styles.formFooter}>
                <button style={styles.saveBtn}><Save size={18} /> Save Changes</button>
              </div>
            </div>
          )}

          {activeTab === 'Business' && (
            <div className="fade-in">
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Business Information</h2>
                <p style={styles.sectionDesc}>Your company details shown on receipts and booking confirmations.</p>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Business Name</label>
                <input type="text" value={settings.businessName} onChange={(e) => setSettings({ ...settings, businessName: e.target.value })} style={styles.input} />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Registration No.</label>
                  <input type="text" value={settings.registrationNo} onChange={(e) => setSettings({ ...settings, registrationNo: e.target.value })} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>TIN</label>
                  <input type="text" value={settings.tin} onChange={(e) => setSettings({ ...settings, tin: e.target.value })} style={styles.input} />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Business Address</label>
                <input type="text" value={settings.businessAddress} onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })} style={styles.input} />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Contact Email</label>
                  <input type="email" value={settings.contactEmail} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Hotline</label>
                  <input type="text" value={settings.hotline} onChange={(e) => setSettings({ ...settings, hotline: e.target.value })} style={styles.input} />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Roadside assistance hotline</label>
                <input
                  type="text"
                  value={settings.roadsideHotline}
                  onChange={(e) => setSettings({ ...settings, roadsideHotline: e.target.value })}
                  style={styles.input}
                  placeholder="+63 917 888 0000"
                />
                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.35rem' }}>
                  Shown to customers when they request emergency help. Falls back to general hotline if empty.
                </p>
              </div>
              <div style={styles.formFooter}>
                <button type="button" style={styles.saveBtn} onClick={handleSeed} disabled={seeding}>
                  {seeding ? 'Seeding...' : 'Seed demo data'}
                </button>
                <button type="button" style={styles.saveBtn} onClick={saveSettings}><Save size={18} /> {saved ? 'Saved!' : 'Save Changes'}</button>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '1rem' }}>
                Logged in as {currentUser?.email} ({currentUser?.role}). To create an admin account, set <code>role: admin</code> on your user document in Firestore.
              </p>
            </div>
          )}

          {activeTab === 'Pricing' && (
            <div className="fade-in">
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Pricing Rules</h2>
                <p style={styles.sectionDesc}>Set base rates and dynamic pricing modifiers for your fleet.</p>
              </div>

              <div style={styles.pricingCard}>
                <div style={styles.pricingHeader}>
                  <h3 style={styles.subTitle}>Seasonal Multiplier</h3>
                  <span style={styles.activeBadge}>Active</span>
                </div>
                <p style={styles.pricingDesc}>Applies a multiplier to base rates during peak seasons (Holy Week, Christmas, etc.)</p>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Peak Season Rate</label>
                    <input type="text" value={settings.peakMultiplier} onChange={(e) => setSettings({ ...settings, peakMultiplier: e.target.value })} style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Off-Peak Rate</label>
                    <input type="text" value={settings.offPeakMultiplier} onChange={(e) => setSettings({ ...settings, offPeakMultiplier: e.target.value })} style={styles.input} />
                  </div>
                </div>
              </div>

              <div style={styles.pricingCard}>
                <div style={styles.pricingHeader}>
                  <h3 style={styles.subTitle}>Long-Term Discount</h3>
                  <span style={styles.activeBadge}>Active</span>
                </div>
                <p style={styles.pricingDesc}>Automatic discount for bookings longer than a set threshold.</p>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Min. Duration (days)</label>
                    <input type="number" value={settings.longTermDays} onChange={(e) => setSettings({ ...settings, longTermDays: Number(e.target.value) })} style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Discount (%)</label>
                    <input type="number" value={settings.longTermDiscount} onChange={(e) => setSettings({ ...settings, longTermDiscount: Number(e.target.value) })} style={styles.input} />
                  </div>
                </div>
              </div>

              <div style={styles.formFooter}>
                <button type="button" style={styles.saveBtn} onClick={saveSettings}><Save size={18} /> Save Pricing Rules</button>
              </div>
            </div>
          )}

          {activeTab === 'Notifications' && (
            <div className="fade-in">
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Notification Preferences</h2>
                <p style={styles.sectionDesc}>Choose how and when you receive alerts about bookings and system events.</p>
              </div>

              {NOTIFICATION_PREFS.map((pref) => (
                <div key={pref.key} style={styles.toggleRow}>
                  <div>
                    <div style={styles.toggleTitle}>{pref.title}</div>
                    <div style={styles.toggleDesc}>{pref.desc}</div>
                  </div>
                  <Toggle
                    checked={Boolean(settings[pref.key])}
                    onChange={() => toggleNotificationPref(pref.key)}
                    label={pref.title}
                  />
                </div>
              ))}

              <div style={styles.formFooter}>
                <button type="button" style={styles.saveBtn} onClick={saveSettings}>
                  <Save size={18} /> {saved ? 'Saved!' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageHeader: { marginBottom: '2rem' },
  pageTitle: { fontSize: '2rem', fontWeight: 600, color: '#111' },
  layout: { display: 'flex', gap: '2rem', minHeight: '600px' },
  tabSidebar: { width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  tabBtn: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: '8px', border: 'none', background: 'none', color: '#666', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)' },
  tabBtnActive: { backgroundColor: '#FFF', color: '#111', fontWeight: 600, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  contentArea: { flex: 1, backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '2rem' },
  sectionHeader: { marginBottom: '2rem' },
  sectionTitle: { fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' },
  sectionDesc: { color: '#666', fontSize: '0.9rem' },
  subTitle: { fontSize: '1rem', fontWeight: 600 },
  formGroup: { marginBottom: '1.5rem', flex: 1 },
  formRow: { display: 'flex', gap: '1.5rem' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#444', marginBottom: '0.5rem' },
  input: { width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontFamily: 'var(--font-primary)', fontSize: '0.9rem', outline: 'none', backgroundColor: '#FAFAFA', boxSizing: 'border-box' },
  divider: { height: '1px', backgroundColor: 'var(--border-color)', margin: '2rem 0' },
  formFooter: { display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem' },
  saveBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--text-color)', color: '#FFF', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 500, cursor: 'pointer', fontSize: '0.9rem' },
  pricingCard: { backgroundColor: '#FAFAFA', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' },
  pricingHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
  pricingDesc: { color: '#666', fontSize: '0.85rem', marginBottom: '1.5rem' },
  activeBadge: { padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#E8F5E9', color: '#2E7D32' },
  toggleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 0', borderBottom: '1px solid #F0F0F0' },
  toggleTitle: { fontWeight: 500, fontSize: '0.95rem', marginBottom: '0.25rem' },
  toggleDesc: { color: '#666', fontSize: '0.8rem' },
  switch: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    width: '44px',
    height: '24px',
    borderRadius: '24px',
    border: 'none',
    padding: '2px',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background-color 0.2s ease',
  },
  switchKnob: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#FFF',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
    flexShrink: 0,
  },
};

export default Settings;
