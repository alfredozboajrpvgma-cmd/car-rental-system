/** Default PMS interval when vehicle has no nextServiceKm set. */
export const DEFAULT_SERVICE_INTERVAL_KM = 10000;

export const getVehicleOdometer = (vehicle) => {
  const n = Number(vehicle?.odometerKm);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export const getNextServiceKm = (vehicle) => {
  const n = Number(vehicle?.nextServiceKm);
  if (Number.isFinite(n) && n > 0) return n;
  return DEFAULT_SERVICE_INTERVAL_KM;
};

/** True when within 500 km of next service threshold. */
export const isServiceDueSoon = (vehicle, bufferKm = 500) => {
  const odom = getVehicleOdometer(vehicle);
  const next = getNextServiceKm(vehicle);
  return odom >= Math.max(0, next - bufferKm);
};

export const kmUntilService = (vehicle) => {
  const odom = getVehicleOdometer(vehicle);
  const next = getNextServiceKm(vehicle);
  return Math.max(0, next - odom);
};

export const nextServiceAfterOdometer = (odometerKm) =>
  Math.ceil((Number(odometerKm) || 0) / DEFAULT_SERVICE_INTERVAL_KM) * DEFAULT_SERVICE_INTERVAL_KM
    + DEFAULT_SERVICE_INTERVAL_KM;
