import React, { useState, useEffect, useMemo } from 'react';
import { Wrench, CheckCircle, Clock, Plus, Trash2 } from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Modal from '../../components/Modal';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import { notifyStaff } from '../../utils/notifications';
import { resolveFleetVehicleStatus, formatVehicleFleetStatusLabel } from '../../utils/bookings';
import { fetchVehicleReservationMap } from '../../utils/supabaseBookings';
import MaintenanceInspectionPanel from '../../components/MaintenanceInspectionPanel';
import { emptyChecklistState, checklistProgress } from '../../utils/maintenanceChecklist';
import { nextServiceAfterOdometer } from '../../utils/vehicleMaintenance';

const TASK_STATUSES = {
  DUE_SOON: 'Due Soon',
  IN_SHOP: 'In Shop',
  COMPLETED: 'Completed',
};

const SERVICE_TYPES = [
  'Routine PMS (10,000 km)',
  'Oil Change',
  'Tire Replacement',
  'Battery Replacement',
  'Brake Service',
  'General Inspection',
  'Radiator Fix (Post-Incident)',
  'Other',
];

const defaultDueDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
};

const formatDisplayDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatVehicleLabel = (vehicle) => {
  const name = vehicle.name || `${vehicle.brand || ''} ${vehicle.model || ''}`.trim();
  const plate = vehicle.plate ? ` (${vehicle.plate})` : '';
  return `${name}${plate}`;
};

const formatVehicleOption = (vehicle, reservedIds) =>
  `${formatVehicleLabel(vehicle)} — ${formatVehicleFleetStatusLabel(vehicle, reservedIds)}`;

const EMPTY_TASK_FORM = {
  vehicleId: '',
  serviceType: SERVICE_TYPES[0],
  dueDate: defaultDueDate(),
  estimatedCost: '',
  notes: '',
};

const FieldLabel = ({ text, required = false }) => (
  <span style={labelRowStyle}>
    <span>{text}</span>
    {required && <span style={requiredMarkStyle} aria-hidden="true">*</span>}
  </span>
);

const labelRowStyle = {
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: '0.25rem',
  whiteSpace: 'nowrap',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#555',
};

const requiredMarkStyle = { color: '#C62828', flexShrink: 0 };

const Maintenance = () => {
  const { items: maintenanceTasks, loading, save, remove } = useFirestoreCollection('maintenance');
  const [vehicles, setVehicles] = useState([]);
  const [reservedVehicleIds, setReservedVehicleIds] = useState(new Set());
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);
  const [formError, setFormError] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  const [completeTarget, setCompleteTarget] = useState(null);
  const [completeCost, setCompleteCost] = useState('');
  const [completeOdometer, setCompleteOdometer] = useState('');
  const [completeError, setCompleteError] = useState('');
  const [completing, setCompleting] = useState(false);

  const [actionMessage, setActionMessage] = useState('');
  const [busyTaskId, setBusyTaskId] = useState('');

  useEffect(() => {
    const loadVehicles = async () => {
      setVehiclesLoading(true);
      try {
        const [snap, reservationMap] = await Promise.all([
          getDocs(collection(db, 'vehicles')),
          fetchVehicleReservationMap().catch(() => ({ reserved: new Set(), pending: new Set() })),
        ]);
        setReservedVehicleIds(reservationMap.reserved);
        const list = [];
        snap.forEach((d) => {
          const data = d.data();
          const id = d.id;
          list.push({
            docId: id,
            id,
            ...data,
            status: resolveFleetVehicleStatus(id, data.status, reservationMap.reserved),
          });
        });
        list.sort((a, b) => formatVehicleLabel(a).localeCompare(formatVehicleLabel(b)));
        setVehicles(list);
      } catch (err) {
        console.error(err);
      } finally {
        setVehiclesLoading(false);
      }
    };
    loadVehicles();
  }, []);

  const activeVehicleIds = useMemo(
    () => new Set(
      maintenanceTasks
        .filter((t) => t.status !== TASK_STATUSES.COMPLETED)
        .map((t) => t.vehicleId)
        .filter(Boolean)
    ),
    [maintenanceTasks]
  );

  const schedulableVehicles = useMemo(
    () => vehicles.filter(
      (v) => !activeVehicleIds.has(v.id) && !activeVehicleIds.has(v.docId)
    ),
    [vehicles, activeVehicleIds]
  );

  const canAddTask = schedulableVehicles.length > 0;

  const tasksByStatus = useMemo(() => ({
    dueSoon: maintenanceTasks.filter((t) => t.status === TASK_STATUSES.DUE_SOON),
    inShop: maintenanceTasks.filter((t) => t.status === TASK_STATUSES.IN_SHOP),
    completed: maintenanceTasks
      .filter((t) => t.status === TASK_STATUSES.COMPLETED)
      .sort((a, b) => (b.completedDate || '').localeCompare(a.completedDate || '')),
  }), [maintenanceTasks]);

  const showMessage = (message) => {
    setActionMessage(message);
    setTimeout(() => setActionMessage(''), 4000);
  };

  const setVehicleStatus = async (vehicleId, status) => {
    if (!vehicleId) return;
    await updateDoc(doc(db, 'vehicles', vehicleId), { status });
  };

  const openAddModal = () => {
    setTaskForm({
      ...EMPTY_TASK_FORM,
      vehicleId: '',
      dueDate: defaultDueDate(),
    });
    setFormError('');
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setTaskForm(EMPTY_TASK_FORM);
    setFormError('');
  };

  const setTaskField = (key) => (e) => {
    setTaskForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const submitAddTask = async () => {
    const vehicle = vehicles.find((v) => v.id === taskForm.vehicleId);
    if (!vehicle) {
      setFormError('Select a vehicle for this maintenance task.');
      return;
    }
    if (activeVehicleIds.has(vehicle.id) || activeVehicleIds.has(vehicle.docId)) {
      setFormError('This vehicle already has an open maintenance task.');
      return;
    }
    if (!taskForm.dueDate) {
      setFormError('Due date is required.');
      return;
    }

    setSavingTask(true);
    setFormError('');
    try {
      await save({
        id: `MNT-${Date.now().toString().slice(-4)}`,
        vehicleId: vehicle.id,
        vehicle: formatVehicleLabel(vehicle),
        serviceType: taskForm.serviceType,
        status: TASK_STATUSES.DUE_SOON,
        dueDate: taskForm.dueDate,
        estimatedCost: Number(taskForm.estimatedCost) || 0,
        notes: taskForm.notes.trim(),
        cost: Number(taskForm.estimatedCost) || 0,
      });
      await notifyStaff({
        title: 'Maintenance scheduled',
        message: `${formatVehicleLabel(vehicle)} — ${taskForm.serviceType} due ${formatDisplayDate(taskForm.dueDate)}`,
        link: '/admin/maintenance',
        type: 'maintenance_due',
      });
      closeAddModal();
      showMessage(`Maintenance task scheduled for ${formatVehicleLabel(vehicle)}.`);
    } catch (err) {
      console.error(err);
      setFormError('Could not save task. Please try again.');
    } finally {
      setSavingTask(false);
    }
  };

  const startTask = async (task) => {
    setBusyTaskId(task.id);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await save({
        ...task,
        status: TASK_STATUSES.IN_SHOP,
        startedDate: today,
        inspectionChecklist: task.inspectionChecklist || emptyChecklistState(),
      });
      if (task.vehicleId) {
        await setVehicleStatus(task.vehicleId, 'Maintenance');
      }
      showMessage(`${task.vehicle} moved to In Shop.`);
    } catch (err) {
      console.error(err);
      showMessage('Could not start maintenance. Please try again.');
    } finally {
      setBusyTaskId('');
    }
  };

  const openCompleteModal = (task) => {
    const vehicle = vehicles.find((v) => v.id === task.vehicleId);
    setCompleteTarget(task);
    setCompleteCost(String(task.estimatedCost || task.cost || ''));
    setCompleteOdometer(String(task.odometerKm ?? vehicle?.odometerKm ?? ''));
    setCompleteError('');
  };

  const closeCompleteModal = () => {
    setCompleteTarget(null);
    setCompleteCost('');
    setCompleteOdometer('');
    setCompleteError('');
  };

  const saveTaskChecklist = async (task, inspectionChecklist) => {
    try {
      await save({ ...task, inspectionChecklist });
    } catch (err) {
      console.error(err);
      showMessage('Could not save checklist.');
    }
  };

  const confirmComplete = async () => {
    if (!completeTarget) return;
    const cost = Number(completeCost);
    const odometerKm = Number(completeOdometer);
    if (completeCost.trim() === '' || Number.isNaN(cost) || cost < 0) {
      setCompleteError('Enter a valid service cost.');
      return;
    }
    if (completeOdometer.trim() === '' || Number.isNaN(odometerKm) || odometerKm < 0) {
      setCompleteError('Enter the vehicle odometer reading (km).');
      return;
    }

    setCompleting(true);
    setCompleteError('');
    try {
      const today = new Date().toISOString().slice(0, 10);
      await save({
        ...completeTarget,
        status: TASK_STATUSES.COMPLETED,
        completedDate: today,
        cost,
        odometerKm,
      });
      if (completeTarget.vehicleId) {
        await updateDoc(doc(db, 'vehicles', completeTarget.vehicleId), {
          status: 'Available',
          odometerKm,
          nextServiceKm: nextServiceAfterOdometer(odometerKm),
        });
      }
      closeCompleteModal();
      showMessage(`${completeTarget.vehicle} marked as completed.`);
    } catch (err) {
      console.error(err);
      setCompleteError('Could not complete task. Please try again.');
    } finally {
      setCompleting(false);
    }
  };

  const deleteTask = async (task) => {
    if (!window.confirm(`Remove maintenance task ${task.id}?`)) return;
    setBusyTaskId(task.id);
    try {
      await remove(task.id);
      showMessage('Maintenance task removed.');
    } catch (err) {
      console.error(err);
      showMessage('Could not remove task. Please try again.');
    } finally {
      setBusyTaskId('');
    }
  };

  const getAddTaskEmptyMessage = () => {
    if (vehiclesLoading) return 'Loading fleet vehicles...';
    if (vehicles.length === 0) {
      return 'No vehicles in your fleet yet. Add vehicles in Fleet Management before scheduling PMS or other maintenance.';
    }
    return 'Every vehicle already has an open maintenance task. Complete or remove existing tasks before scheduling another.';
  };

  const renderEmpty = (message) => (
    <p style={styles.emptyCol}>{message}</p>
  );

  return (
    <div className="fade-in">
      <div style={styles.pageHeader}>
        <div style={styles.titleArea}>
          <h1 style={styles.pageTitle}>Maintenance Schedule</h1>
          <span style={styles.counter}>{maintenanceTasks.length} total tasks</span>
        </div>
        <button
          type="button"
          style={styles.addBtn}
          onClick={openAddModal}
          disabled={vehiclesLoading}
        >
          <Plus size={18} /> Add task
        </button>
      </div>

      {actionMessage && <p style={styles.actionMessage}>{actionMessage}</p>}

      {loading ? (
        <p style={styles.loadingText}>Loading maintenance tasks...</p>
      ) : (
        <div style={styles.boardContainer} className="maintenance-board">
          <div style={styles.boardColumn}>
            <div style={styles.colHeader}>
              <div style={styles.colTitle}><Clock size={18} color="#F57F17" /> Due Soon</div>
              <span style={styles.colBadge}>{tasksByStatus.dueSoon.length}</span>
            </div>
            <div style={styles.cardList}>
              {tasksByStatus.dueSoon.length === 0
                ? renderEmpty('No upcoming maintenance scheduled.')
                : tasksByStatus.dueSoon.map((task) => (
                  <div key={task.id} style={styles.taskCard}>
                    <div style={styles.taskCardTop}>
                      <div style={styles.taskId}>{task.id}</div>
                      <button
                        type="button"
                        style={styles.deleteBtn}
                        onClick={() => deleteTask(task)}
                        disabled={busyTaskId === task.id}
                        aria-label="Remove task"
                        title="Remove task"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div style={styles.taskVehicle}>{task.vehicle}</div>
                    <div style={styles.taskType}>{task.serviceType}</div>
                    {task.notes && <p style={styles.taskNotes}>{task.notes}</p>}
                    <div style={styles.taskFooter}>
                      <div style={styles.taskDate}>Due: {formatDisplayDate(task.dueDate || task.date)}</div>
                      <button
                        type="button"
                        style={styles.actionBtn}
                        onClick={() => startTask(task)}
                        disabled={busyTaskId === task.id}
                      >
                        {busyTaskId === task.id ? 'Starting...' : 'Start'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div style={styles.boardColumn}>
            <div style={styles.colHeader}>
              <div style={styles.colTitle}><Wrench size={18} color="#0033FF" /> In Shop</div>
              <span style={styles.colBadge}>{tasksByStatus.inShop.length}</span>
            </div>
            <div style={styles.cardList}>
              {tasksByStatus.inShop.length === 0
                ? renderEmpty('No vehicles currently in the shop.')
                : tasksByStatus.inShop.map((task) => (
                  <div key={task.id} style={{ ...styles.taskCard, borderLeft: '4px solid #0033FF' }}>
                    <div style={styles.taskId}>{task.id}</div>
                    <div style={styles.taskVehicle}>{task.vehicle}</div>
                    <div style={styles.taskType}>{task.serviceType}</div>
                    {task.odometerKm != null && (
                      <div style={styles.odometerTag}>{Number(task.odometerKm).toLocaleString()} km</div>
                    )}
                    <MaintenanceInspectionPanel
                      items={task.inspectionChecklist}
                      onChange={(items) => saveTaskChecklist(task, items)}
                      compact
                    />
                    <div style={styles.taskFooter}>
                      <div style={styles.taskDate}>Started: {formatDisplayDate(task.startedDate || task.date)}</div>
                      <button
                        type="button"
                        style={{ ...styles.actionBtn, backgroundColor: '#E8F5E9', color: '#2E7D32' }}
                        onClick={() => openCompleteModal(task)}
                        disabled={busyTaskId === task.id}
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div style={styles.boardColumn}>
            <div style={styles.colHeader}>
              <div style={styles.colTitle}><CheckCircle size={18} color="#2E7D32" /> Completed (Recent)</div>
              <span style={styles.colBadge}>{tasksByStatus.completed.length}</span>
            </div>
            <div style={styles.cardList}>
              {tasksByStatus.completed.length === 0
                ? renderEmpty('Completed service records will appear here.')
                : tasksByStatus.completed.map((task) => (
                  <div key={task.id} style={{ ...styles.taskCard, opacity: 0.85 }}>
                    <div style={styles.taskId}>{task.id}</div>
                    <div style={styles.taskVehicle}>{task.vehicle}</div>
                    <div style={styles.taskType}>{task.serviceType}</div>
                    <div style={styles.taskFooter}>
                      <div style={styles.taskDate}>
                        Completed: {formatDisplayDate(task.completedDate || task.date)}
                      </div>
                      <div style={styles.costBadge}>₱{(task.cost || 0).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <Modal
        open={showAddModal}
        onClose={closeAddModal}
        title="Schedule Maintenance"
        maxWidth="520px"
        footer={
          canAddTask ? (
            <>
              <button type="button" style={styles.btnSecondary} onClick={closeAddModal} disabled={savingTask}>
                Cancel
              </button>
              <button type="button" style={styles.btnPrimary} onClick={submitAddTask} disabled={savingTask}>
                {savingTask ? 'Saving...' : 'Add Task'}
              </button>
            </>
          ) : (
            <button type="button" style={styles.btnSecondary} onClick={closeAddModal}>Close</button>
          )
        }
      >
        <div style={styles.formArea}>
          {canAddTask ? (
            <>
              <label style={styles.formLabel}>
                <FieldLabel text="Vehicle for service" required />
                <select
                  className="location-field location-field-select"
                  value={taskForm.vehicleId}
                  onChange={setTaskField('vehicleId')}
                >
                  <option value="">Choose a vehicle...</option>
                  {schedulableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>{formatVehicleOption(v, reservedVehicleIds)}</option>
                  ))}
                </select>
                <p style={styles.fieldHint}>
                  Pick any fleet vehicle to schedule PMS or other service. Fleet status updates when work starts.
                </p>
              </label>
              <label style={styles.formLabel}>
                <FieldLabel text="Service type" required />
                <select
                  className="location-field location-field-select"
                  value={taskForm.serviceType}
                  onChange={setTaskField('serviceType')}
                >
                  {SERVICE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label style={styles.formLabel}>
                <FieldLabel text="Due date" required />
                <input
                  type="date"
                  className="location-field"
                  value={taskForm.dueDate}
                  onChange={setTaskField('dueDate')}
                />
              </label>
              <label style={styles.formLabel}>
                <FieldLabel text="Estimated cost (₱)" />
                <input
                  type="number"
                  min="0"
                  className="location-field"
                  value={taskForm.estimatedCost}
                  onChange={setTaskField('estimatedCost')}
                  placeholder="4500"
                />
              </label>
              <label style={styles.formLabel}>
                <FieldLabel text="Notes" />
                <textarea
                  className="location-field"
                  style={styles.notesInput}
                  value={taskForm.notes}
                  onChange={setTaskField('notes')}
                  placeholder="Optional details for the service team"
                  rows={3}
                />
              </label>
            </>
          ) : (
            <p style={styles.emptyModalText}>{getAddTaskEmptyMessage()}</p>
          )}
          {formError && <p style={styles.formError}>{formError}</p>}
        </div>
      </Modal>

      <Modal
        open={Boolean(completeTarget)}
        onClose={closeCompleteModal}
        title="Complete Maintenance"
        maxWidth="480px"
        footer={
          <>
            <button type="button" style={styles.btnSecondary} onClick={closeCompleteModal} disabled={completing}>
              Cancel
            </button>
            <button type="button" style={styles.btnSuccess} onClick={confirmComplete} disabled={completing}>
              {completing ? 'Saving...' : 'Mark Completed'}
            </button>
          </>
        }
      >
        <div style={styles.formArea}>
          {completeTarget && (
            <>
              <p style={styles.completeSummary}>
                <strong>{completeTarget.vehicle}</strong>
                <br />
                {completeTarget.serviceType}
              </p>
              <label style={styles.formLabel}>
                <FieldLabel text="Odometer reading (km)" required />
                <input
                  type="number"
                  min="0"
                  className="location-field"
                  value={completeOdometer}
                  onChange={(e) => setCompleteOdometer(e.target.value)}
                  placeholder="e.g. 45200"
                />
              </label>
              <label style={styles.formLabel}>
                <FieldLabel text="Final service cost (₱)" required />
                <input
                  type="number"
                  min="0"
                  className="location-field"
                  value={completeCost}
                  onChange={(e) => setCompleteCost(e.target.value)}
                  placeholder="Enter actual cost"
                  autoFocus
                />
              </label>
              <p style={styles.fieldHint}>The vehicle will be marked Available in the fleet after completion.</p>
            </>
          )}
          {completeError && <p style={styles.formError}>{completeError}</p>}
        </div>
      </Modal>
    </div>
  );
};

const styles = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  titleArea: { display: 'flex', alignItems: 'baseline', gap: '1rem' },
  pageTitle: { fontSize: '2rem', fontWeight: 600, color: '#111', margin: 0 },
  counter: { fontSize: '0.9rem', color: '#888' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none', background: '#111', color: '#FFF', cursor: 'pointer', fontWeight: 500 },
  actionMessage: { color: '#2E7D32', fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' },
  loadingText: { color: '#666', fontSize: '0.95rem' },
  boardContainer: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', minHeight: '600px' },
  boardColumn: { backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column' },
  colHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 0.5rem' },
  colTitle: { fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' },
  colBadge: { backgroundColor: '#E0E0E0', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 },
  cardList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  emptyCol: { color: '#888', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 1rem', margin: 0, lineHeight: 1.5 },
  taskCard: { backgroundColor: '#FFF', borderRadius: '8px', padding: '1.25rem', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  taskCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
  taskId: { fontSize: '0.75rem', fontFamily: 'monospace', color: '#888' },
  deleteBtn: { background: 'none', border: 'none', color: '#AAA', cursor: 'pointer', padding: '0.25rem', display: 'flex' },
  taskVehicle: { fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem', color: '#111' },
  taskType: { fontSize: '0.85rem', color: '#444', marginBottom: '0.75rem' },
  odometerTag: { fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem', fontWeight: 600 },
  taskNotes: { fontSize: '0.8rem', color: '#666', margin: '0 0 0.75rem', lineHeight: 1.4 },
  taskFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' },
  taskDate: { fontSize: '0.8rem', color: '#666', fontWeight: 500 },
  costBadge: { fontSize: '0.85rem', fontWeight: 600, color: '#2E7D32' },
  actionBtn: { padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, border: 'none', backgroundColor: '#F0F0F0', color: '#333', cursor: 'pointer' },
  formArea: { display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' },
  formLabel: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  notesInput: { resize: 'vertical', minHeight: '80px' },
  formError: { color: '#C62828', fontSize: '0.85rem', margin: 0 },
  fieldHint: { color: '#666', fontSize: '0.8rem', margin: 0, lineHeight: 1.4 },
  emptyModalText: { color: '#666', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 },
  completeSummary: { color: '#444', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 0.5rem' },
  btnPrimary: { backgroundColor: '#0033FF', color: '#FFF', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 500, cursor: 'pointer' },
  btnSecondary: { backgroundColor: '#FFF', color: '#333', padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #E0E0E0', fontWeight: 500, cursor: 'pointer' },
  btnSuccess: { backgroundColor: '#2E7D32', color: '#FFF', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 500, cursor: 'pointer' },
};

export default Maintenance;
