// Mock data for Restaurant Operations Management Platform

export const outlets = [
  { id: '1', name: 'Outlet KL Central', code: 'KLC', status: 'operational' },
  { id: '2', name: 'Outlet Bangsar', code: 'BSR', status: 'operational' },
  { id: '3', name: 'Outlet KLCC', code: 'KCC', status: 'warning' },
  { id: '4', name: 'Outlet Damansara', code: 'DMS', status: 'operational' },
  { id: '5', name: 'Outlet Subang', code: 'SBJ', status: 'critical' },
]

export const ticketTrendData = [
  { date: 'May 1', open: 12, resolved: 8, escalated: 2 },
  { date: 'May 5', open: 18, resolved: 14, escalated: 3 },
  { date: 'May 10', open: 22, resolved: 19, escalated: 4 },
  { date: 'May 15', open: 15, resolved: 21, escalated: 1 },
  { date: 'May 20', open: 28, resolved: 17, escalated: 5 },
  { date: 'May 25', open: 19, resolved: 24, escalated: 2 },
  { date: 'May 28', open: 14, resolved: 20, escalated: 1 },
]

export const issueCategoryData = [
  { name: 'Equipment', value: 34, color: '#3b82f6' },
  { name: 'Plumbing', value: 18, color: '#10b981' },
  { name: 'Electrical', value: 22, color: '#f59e0b' },
  { name: 'HVAC', value: 12, color: '#8b5cf6' },
  { name: 'IT / POS', value: 9, color: '#ef4444' },
  { name: 'Others', value: 5, color: '#6b7280' },
]

export const maintenanceCostData = [
  { month: 'Jan', cost: 12400, budget: 15000 },
  { month: 'Feb', cost: 9800, budget: 15000 },
  { month: 'Mar', cost: 14200, budget: 15000 },
  { month: 'Apr', cost: 11600, budget: 15000 },
  { month: 'May', cost: 13900, budget: 15000 },
]

export const outletRankings = [
  { outlet: 'KL Central', score: 94, tickets: 3, sla: 98 },
  { outlet: 'Bangsar', score: 88, tickets: 7, sla: 92 },
  { outlet: 'KLCC', score: 76, tickets: 12, sla: 78 },
  { outlet: 'Damansara', score: 91, tickets: 5, sla: 95 },
  { outlet: 'Subang', score: 62, tickets: 18, sla: 65 },
]

export const realtimeAlerts = [
  { id: 'a1', type: 'critical', message: 'Walk-in freezer temperature alert — Subang outlet', time: '2m ago', outlet: 'Subang' },
  { id: 'a2', type: 'warning', message: 'SLA breach imminent — Ticket #TK-2041 (KLCC outlet)', time: '8m ago', outlet: 'KLCC' },
  { id: 'a3', type: 'info', message: 'Scheduled PM completed — Fryer Unit #FR-04 (Bangsar)', time: '22m ago', outlet: 'Bangsar' },
  { id: 'a4', type: 'critical', message: 'POS system unresponsive — Terminal 2 (Subang)', time: '35m ago', outlet: 'Subang' },
  { id: 'a5', type: 'warning', message: 'Water heater pressure deviation — KL Central', time: '1h ago', outlet: 'KL Central' },
]

export const tickets = [
  {
    id: 'TK-2048', title: 'Fryer unit not heating to target temp', outlet: 'Subang', category: 'Equipment',
    priority: 'critical', status: 'open', assignee: 'Ahmad Razif', created: '2024-05-28 08:12', slaHours: 2,
    description: 'Fryer #3 not reaching 180°C. Staff unable to operate lunch service.',
  },
  {
    id: 'TK-2047', title: 'Drainage blockage at kitchen sink', outlet: 'KLCC', category: 'Plumbing',
    priority: 'high', status: 'in_progress', assignee: 'Lee Chong Wei', created: '2024-05-28 07:45', slaHours: 4,
    description: 'Kitchen sink draining slowly causing operational delays.',
  },
  {
    id: 'TK-2046', title: 'Air-cond tripping MCB repeatedly', outlet: 'Bangsar', category: 'Electrical',
    priority: 'high', status: 'in_progress', assignee: 'Mohd Faris', created: '2024-05-27 15:30', slaHours: 6,
    description: 'HVAC unit causing MCB to trip every 2 hours in dining area.',
  },
  {
    id: 'TK-2045', title: 'POS terminal screen flickering', outlet: 'KL Central', category: 'IT / POS',
    priority: 'medium', status: 'open', assignee: 'Unassigned', created: '2024-05-27 12:00', slaHours: 24,
    description: 'Terminal 1 screen intermittently flickers affecting cashier.',
  },
  {
    id: 'TK-2044', title: 'Refrigerator compressor noise', outlet: 'Damansara', category: 'Equipment',
    priority: 'medium', status: 'resolved', assignee: 'Raj Kumar', created: '2024-05-26 09:00', slaHours: 24,
    description: 'Loud compressor noise from cold storage unit.',
  },
  {
    id: 'TK-2043', title: 'Ceiling light flickering — dining area', outlet: 'Subang', category: 'Electrical',
    priority: 'low', status: 'open', assignee: 'Unassigned', created: '2024-05-26 08:00', slaHours: 48,
    description: 'Two ceiling lights flickering in main dining section.',
  },
  {
    id: 'TK-2042', title: 'Hot water not available — staff washroom', outlet: 'KLCC', category: 'Plumbing',
    priority: 'medium', status: 'in_progress', assignee: 'Lee Chong Wei', created: '2024-05-25 14:00', slaHours: 8,
    description: 'Water heater unit offline in staff washroom.',
  },
  {
    id: 'TK-2041', title: 'Ice machine not producing ice', outlet: 'KLCC', category: 'Equipment',
    priority: 'high', status: 'open', assignee: 'Ahmad Razif', created: '2024-05-25 10:30', slaHours: 1,
    description: 'Ice machine #2 completely non-functional since morning.',
  },
]

export const assets = [
  { id: 'AST-001', name: 'Fryer Unit #1', category: 'Kitchen Equipment', outlet: 'KL Central', status: 'operational', lastPM: '2024-04-15', nextPM: '2024-07-15', age: '3y 2m' },
  { id: 'AST-002', name: 'Walk-in Freezer', category: 'Cold Storage', outlet: 'Subang', status: 'warning', lastPM: '2024-03-01', nextPM: '2024-06-01', age: '5y 8m' },
  { id: 'AST-003', name: 'HVAC Unit #1', category: 'HVAC', outlet: 'Bangsar', status: 'maintenance', lastPM: '2024-05-20', nextPM: '2024-08-20', age: '2y 1m' },
  { id: 'AST-004', name: 'POS Terminal #2', category: 'IT Equipment', outlet: 'KL Central', status: 'operational', lastPM: '2024-04-01', nextPM: '2024-07-01', age: '1y 6m' },
  { id: 'AST-005', name: 'Water Heater', category: 'Plumbing', outlet: 'KLCC', status: 'critical', lastPM: '2024-02-10', nextPM: '2024-05-10', age: '4y 3m' },
  { id: 'AST-006', name: 'Exhaust Hood System', category: 'Kitchen Equipment', outlet: 'Damansara', status: 'operational', lastPM: '2024-05-01', nextPM: '2024-08-01', age: '2y 9m' },
]

export const workOrders = [
  { id: 'WO-0112', asset: 'Fryer Unit #1', type: 'Preventive', technician: 'Ahmad Razif', outlet: 'KL Central', scheduled: '2024-06-01', status: 'scheduled', priority: 'medium' },
  { id: 'WO-0111', asset: 'Walk-in Freezer', type: 'Corrective', technician: 'Mohd Faris', outlet: 'Subang', scheduled: '2024-05-29', status: 'in_progress', priority: 'critical' },
  { id: 'WO-0110', asset: 'HVAC Unit #1', type: 'Preventive', technician: 'Lee Chong Wei', outlet: 'Bangsar', scheduled: '2024-05-28', status: 'completed', priority: 'medium' },
  { id: 'WO-0109', asset: 'Water Heater', type: 'Corrective', technician: 'Raj Kumar', outlet: 'KLCC', scheduled: '2024-05-27', status: 'overdue', priority: 'high' },
]

export const technicians = [
  { name: 'Ahmad Razif', role: 'Senior Technician', activeJobs: 3, completedToday: 2, utilization: 85, avatar: 'AR' },
  { name: 'Lee Chong Wei', role: 'Technician', activeJobs: 2, completedToday: 3, utilization: 72, avatar: 'LC' },
  { name: 'Mohd Faris', role: 'Technician', activeJobs: 1, completedToday: 1, utilization: 45, avatar: 'MF' },
  { name: 'Raj Kumar', role: 'Junior Technician', activeJobs: 2, completedToday: 0, utilization: 60, avatar: 'RK' },
]

export const complaints = [
  { id: 'GC-0198', customer: 'Nurul Ain', outlet: 'KLCC', category: 'Food Quality', severity: 'high', status: 'open', sentiment: 'negative', date: '2024-05-28 12:30', message: 'Chicken was undercooked and served cold. Very disappointed with the experience.', recovery: null },
  { id: 'GC-0197', customer: 'David Lim', outlet: 'Bangsar', category: 'Service Speed', severity: 'medium', status: 'in_progress', sentiment: 'negative', date: '2024-05-28 11:15', message: 'Waited over 30 minutes for our order during non-peak hours.', recovery: 'Complimentary dessert offered' },
  { id: 'GC-0196', customer: 'Priya Nair', outlet: 'KL Central', category: 'Cleanliness', severity: 'high', status: 'resolved', sentiment: 'negative', date: '2024-05-27 19:45', message: 'Washroom was extremely dirty and had no soap.', recovery: 'Apology + dining voucher RM50' },
  { id: 'GC-0195', customer: 'Haziq Ibrahim', outlet: 'Subang', category: 'Wrong Order', severity: 'low', status: 'resolved', sentiment: 'neutral', date: '2024-05-27 14:20', message: 'Order was mixed up at the counter.', recovery: 'Replacement meal provided' },
  { id: 'GC-0194', customer: 'Mei Ling', outlet: 'Damansara', category: 'Food Quality', severity: 'critical', status: 'escalated', sentiment: 'negative', date: '2024-05-26 20:00', message: 'Found a foreign object in the food. Extremely concerning.', recovery: 'Management escalation' },
]

export const complaintTrendData = [
  { date: 'May 1', complaints: 4, resolved: 3 },
  { date: 'May 8', complaints: 7, resolved: 5 },
  { date: 'May 15', complaints: 5, resolved: 6 },
  { date: 'May 22', complaints: 9, resolved: 7 },
  { date: 'May 28', complaints: 6, resolved: 4 },
]

export const sentimentData = [
  { name: 'Negative', value: 58, color: '#ef4444' },
  { name: 'Neutral', value: 24, color: '#f59e0b' },
  { name: 'Positive', value: 18, color: '#10b981' },
]

export const complaintCategoryData = [
  { category: 'Food Quality', count: 28 },
  { category: 'Service Speed', count: 19 },
  { category: 'Cleanliness', count: 14 },
  { category: 'Wrong Order', count: 11 },
  { category: 'Staff Attitude', count: 8 },
  { category: 'Others', count: 6 },
]

export const expenseRequests = [
  { id: 'EXP-0412', title: 'Emergency plumbing repair parts', outlet: 'KLCC', amount: 1250, category: 'Maintenance', requestor: 'Lee Chong Wei', date: '2024-05-28', status: 'pending', priority: 'urgent' },
  { id: 'EXP-0411', title: 'Staff safety equipment restock', outlet: 'Subang', amount: 480, category: 'Safety', requestor: 'Haziq Ibrahim', date: '2024-05-27', status: 'pending', priority: 'normal' },
  { id: 'EXP-0410', title: 'POS printer ribbon replacement', outlet: 'KL Central', amount: 85, category: 'IT', requestor: 'Nurul Syahira', date: '2024-05-27', status: 'approved', priority: 'normal' },
  { id: 'EXP-0409', title: 'Kitchen cleaning chemicals bulk order', outlet: 'Bangsar', amount: 320, category: 'Supplies', requestor: 'Mohd Faizal', date: '2024-05-26', status: 'approved', priority: 'normal' },
  { id: 'EXP-0408', title: 'Air filter replacement — HVAC units', outlet: 'Damansara', amount: 760, category: 'Maintenance', requestor: 'Raj Kumar', date: '2024-05-25', status: 'rejected', priority: 'low' },
]

export const financeSummary = {
  totalBudget: 75000,
  spent: 52340,
  pending: 8640,
  remaining: 14020,
}

export const capaItems = [
  { id: 'CAPA-0088', issue: 'Recurring oil spillage near fryer station', category: 'Safety', severity: 'high', outlet: 'Subang', rootCause: 'Inadequate splash guard', status: 'in_progress', dueDate: '2024-06-05', assignee: 'Ahmad Razif' },
  { id: 'CAPA-0087', issue: 'Temperature log non-compliance — cold storage', category: 'Food Safety', severity: 'critical', outlet: 'KLCC', rootCause: 'Staff training gap', status: 'open', dueDate: '2024-05-31', assignee: 'Nurul Syahira' },
  { id: 'CAPA-0086', issue: 'Improper waste segregation at back-of-house', category: 'Hygiene', severity: 'medium', outlet: 'Bangsar', rootCause: 'Bin labeling unclear', status: 'resolved', dueDate: '2024-05-20', assignee: 'Mohd Faizal' },
  { id: 'CAPA-0085', issue: 'Food handler not using gloves during prep', category: 'Food Safety', severity: 'high', outlet: 'KL Central', rootCause: 'SOP not followed', status: 'in_progress', dueDate: '2024-06-01', assignee: 'Lee Chong Wei' },
]

export const qaScoreData = [
  { outlet: 'KL Central', score: 91, target: 85 },
  { outlet: 'Bangsar', score: 87, target: 85 },
  { outlet: 'KLCC', score: 73, target: 85 },
  { outlet: 'Damansara', score: 89, target: 85 },
  { outlet: 'Subang', score: 68, target: 85 },
]

export const notifications = [
  { id: 'n1', type: 'critical', title: 'SLA Breach — TK-2041', message: 'Ticket TK-2041 (Ice machine) at KLCC has breached SLA by 45 minutes.', time: '2m ago', read: false },
  { id: 'n2', type: 'warning', title: 'PM Due Tomorrow', message: 'Walk-in Freezer at Subang outlet is due for preventive maintenance on May 29.', time: '15m ago', read: false },
  { id: 'n3', type: 'info', title: 'Ticket Assigned to You', message: 'TK-2048 (Fryer unit) has been assigned to Ahmad Razif.', time: '32m ago', read: false },
  { id: 'n4', type: 'success', title: 'Work Order Completed', message: 'WO-0110 (HVAC PM — Bangsar) marked as completed by Lee Chong Wei.', time: '1h ago', read: true },
  { id: 'n5', type: 'warning', title: 'Expense Approval Required', message: 'EXP-0412 (Plumbing repair RM1,250) requires your approval — submitted by Lee CW.', time: '2h ago', read: true },
  { id: 'n6', type: 'critical', title: 'Temperature Alert', message: 'Walk-in freezer temperature reading 6°C — above safety threshold (4°C) at Subang.', time: '3h ago', read: true },
  { id: 'n7', type: 'info', title: 'Guest Complaint Escalated', message: 'GC-0194 (Foreign object in food) has been escalated to Operations Manager.', time: '4h ago', read: true },
]
