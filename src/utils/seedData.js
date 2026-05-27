import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { RENTAL_MODES } from './rentalMode';

export const mockFleet = [
  { 
    id: 'PH-101', 
    brand: 'Toyota', 
    model: 'Vios 1.5 G', 
    name: 'Toyota Vios 1.5 G',
    type: 'Sedan',
    seats: 5,
    fuel: 'Gasoline',
    transmission: 'A/T',
    plate: 'ABC 1234', 
    status: 'Available', 
    price: 1500,
    rating: 4.8,
    location: 'Makati Hub',
    image: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=400&q=80'
  },
  { 
    id: 'PH-102', 
    brand: 'Mitsubishi', 
    model: 'Montero Sport', 
    name: 'Mitsubishi Montero Sport',
    type: 'SUV',
    seats: 7,
    fuel: 'Diesel',
    transmission: 'A/T',
    plate: 'XYZ 9876', 
    status: 'Available', 
    price: 3500,
    rating: 4.9,
    location: 'BGC Hub',
    image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=400&q=80'
  },
  { 
    id: 'PH-103', 
    brand: 'Toyota', 
    model: 'Innova', 
    name: 'Toyota Innova',
    type: 'MPV',
    seats: 8,
    fuel: 'Diesel',
    transmission: 'A/T',
    plate: 'DEF 5678', 
    status: 'Available', 
    price: 2500,
    rating: 4.7,
    location: 'Quezon City',
    image: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=400&q=80'
  },
  { 
    id: 'PH-104', 
    brand: 'Toyota', 
    model: 'Fortuner', 
    name: 'Toyota Fortuner',
    type: 'SUV',
    seats: 7, 
    fuel: 'Diesel', 
    transmission: 'M/T', 
    plate: 'GHI 3456',
    status: 'Available',
    price: 3500, 
    rating: 4.9, 
    location: 'Makati Hub',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=400&q=80' 
  },
  { 
    id: 'PH-105', 
    brand: 'Honda',
    model: 'Civic',
    name: 'Honda Civic', 
    type: 'Sedan', 
    seats: 5, 
    fuel: 'Gasoline', 
    transmission: 'A/T', 
    plate: 'JKL 7890',
    status: 'Available',
    price: 2000, 
    rating: 4.6, 
    location: 'BGC Hub',
    image: 'https://images.unsplash.com/photo-1590362891991-f700b7414966?auto=format&fit=crop&w=400&q=80' 
  },
  { 
    id: 'PH-106', 
    brand: 'Hyundai',
    model: 'Starex',
    name: 'Hyundai Starex', 
    type: 'Van', 
    seats: 10, 
    fuel: 'Diesel', 
    transmission: 'M/T', 
    plate: 'MNO 1234',
    status: 'Available',
    price: 4000, 
    rating: 4.5, 
    location: 'Quezon City',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80' 
  },
];

export const defaultLocations = [
  { id: 'LOC-01', name: 'Main Hub - Makati', type: 'Primary Hub', address: '123 Ayala Avenue, Makati City', lat: 14.5547, lng: 121.0244, phone: '+63 2 8888 1111', email: 'makati@driveph.com', hours: '24/7 Open', vehicleCount: 0, capacity: 20, status: 'Active' },
  { id: 'LOC-02', name: 'BGC Flagship Hub', type: 'Primary Hub', address: '5th Avenue, BGC, Taguig', lat: 14.5515, lng: 121.0477, phone: '+63 2 8888 2222', email: 'bgc@driveph.com', hours: '6:00 AM - 10:00 PM', vehicleCount: 0, capacity: 15, status: 'Active' },
  { id: 'LOC-03', name: 'NAIA Terminal 3', type: 'Airport Kiosk', address: 'NAIA Terminal 3, Pasay City', lat: 14.5086, lng: 121.0198, phone: '+63 2 8888 3333', email: 'naia3@driveph.com', hours: '24/7 Open', vehicleCount: 0, capacity: 5, status: 'Active' },
  { id: 'LOC-04', name: 'Quezon City Garage', type: 'Maintenance & Hub', address: 'Tomas Morato Ave, Quezon City', lat: 14.629, lng: 121.034, phone: '+63 2 8888 4444', email: 'qc@driveph.com', hours: '8:00 AM - 8:00 PM', vehicleCount: 0, capacity: 30, status: 'Active' },
];

export const seedVehicles = async () => {
  for (const vehicle of mockFleet) {
    const rentalMode = vehicle.rentalMode
      ?? (vehicle.type === 'Van' ? RENTAL_MODES.WITH_DRIVER : RENTAL_MODES.SELF_DRIVE);
    await setDoc(doc(db, 'vehicles', vehicle.id), { ...vehicle, rentalMode });
  }
};

export const seedLocations = async () => {
  for (const loc of defaultLocations) {
    await setDoc(doc(db, 'locations', loc.id), loc);
  }
};

export const defaultDrivers = [
  { id: 'DRV-1001', name: 'Ricardo Dalisay', email: 'ricardo@email.com', phone: '+63 917 222 3333', location: 'Makati Hub', status: 'On Duty', verified: true, licenseNo: 'N01-12-123456', completedTrips: 145, rating: 4.9, avatar: 'RD' },
  { id: 'DRV-1002', name: 'Eduardo Manalo', email: 'eduardo@email.com', phone: '+63 918 444 5555', location: 'BGC Hub', status: 'Available', verified: true, licenseNo: 'N02-14-987654', completedTrips: 89, rating: 4.7, avatar: 'EM' },
];

export const seedDrivers = async () => {
  for (const d of defaultDrivers) {
    await setDoc(doc(db, 'drivers', d.id), d);
  }
};

export const seedInitialData = async () => {
  await seedVehicles();
  await seedLocations();
  await seedDrivers();
};
