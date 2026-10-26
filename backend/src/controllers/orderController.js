import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Patient from '../models/Patient.js';
import { ApiError } from '../utils/apiError.js';
import { sendSuccess } from '../utils/response.js';
import { writeAudit } from '../utils/audit.js';

const CATEGORIES = ['medication', 'equipment', 'dialysis'];
const ORDER_TYPES = ['nurse', 'pharmacy', 'radiology'];
const STATUSES = ['ordered', 'in_progress', 'fulfilled', 'cancelled'];

const cleanDate = (v) => {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/**
 * POST /orders  (doctor / admin)
 * Create a medicine or equipment order.
 */
export const createOrder = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!String(b.name || '').trim()) throw new ApiError(400, 'Order name is required');

  let patientName = String(b.patientName || '').trim();
  if (b.patient && !patientName) {
    const p = await Patient.findById(b.patient).select('firstName lastName');
    if (p) patientName = `${p.firstName || ''} ${p.lastName || ''}`.trim();
  }

  const order = await Order.create({
    orderType: ORDER_TYPES.includes(b.orderType) ? b.orderType : 'nurse',
    category: CATEGORIES.includes(b.category) ? b.category : 'medication',
    name: String(b.name).trim(),
    details: String(b.details || '').trim(),
    instruction: String(b.instruction || '').trim(),
    homeInstruction: String(b.homeInstruction || '').trim(),
    quantity: Number(b.quantity) || 1,
    standing: b.standing === true || b.standing === 'true',
    orderDate: cleanDate(b.orderDate) || new Date(),
    patient: b.patient || undefined,
    patientName,
    orderedBy: req.user?._id,
    orderedByName: req.user?.name,
    orderedByRole: req.user?.role,
  });

  await writeAudit({ user: req.user, action: 'order.create', entity: 'Order', entityId: order._id });
  return sendSuccess(res, { message: 'Order placed', data: order });
});

/**
 * GET /orders  (doctor / admin / front desk)
 * Filters: category, standing, status, month+year (by orderDate), patient.
 */
export const listOrders = asyncHandler(async (req, res) => {
  const { category, standing, status, month, year, patient, orderType } = req.query;
  const q = {};
  if (category) q.category = category;
  if (orderType) q.orderType = orderType;
  if (status) q.status = status;
  if (patient) q.patient = patient;
  if (standing !== undefined) q.standing = standing === 'true' || standing === '1';

  if (year) {
    const y = Number(year);
    if (month) {
      const m = Number(month) - 1;
      q.orderDate = { $gte: new Date(y, m, 1), $lt: new Date(y, m + 1, 1) };
    } else {
      q.orderDate = { $gte: new Date(y, 0, 1), $lt: new Date(y + 1, 0, 1) };
    }
  }

  const orders = await Order.find(q)
    .populate('patient', 'mrn firstName lastName')
    .sort({ orderDate: -1, createdAt: -1 })
    .lean();

  return sendSuccess(res, { message: 'Orders', data: orders, meta: { total: orders.length } });
});

/**
 * PATCH /orders/:id  (doctor / admin / front desk)
 * Edit fields or change status (fulfil / cancel).
 */
export const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');

  const b = req.body || {};
  if (b.orderType && ORDER_TYPES.includes(b.orderType)) order.orderType = b.orderType;
  if (b.category && CATEGORIES.includes(b.category)) order.category = b.category;
  if (b.name !== undefined) order.name = String(b.name).trim() || order.name;
  if (b.details !== undefined) order.details = String(b.details).trim();
  if (b.instruction !== undefined) order.instruction = String(b.instruction).trim();
  if (b.homeInstruction !== undefined) order.homeInstruction = String(b.homeInstruction).trim();
  if (b.quantity !== undefined) order.quantity = Number(b.quantity) || order.quantity;
  if (b.standing !== undefined) order.standing = b.standing === true || b.standing === 'true';
  if (b.orderDate !== undefined) order.orderDate = cleanDate(b.orderDate) || order.orderDate;
  if (b.nurseComment !== undefined) order.nurseComment = String(b.nurseComment).trim();

  if (b.status && STATUSES.includes(b.status)) {
    order.status = b.status;
    if (b.status === 'fulfilled') {
      order.fulfilledBy = req.user?._id;
      order.fulfilledByName = req.user?.name;
      order.fulfilledAt = new Date();
    }
  }

  await order.save();
  await writeAudit({ user: req.user, action: 'order.update', entity: 'Order', entityId: order._id, details: { status: order.status } });
  return sendSuccess(res, { message: 'Order updated', data: order });
});

/**
 * DELETE /orders/:id  (doctor / admin)
 */
export const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  await writeAudit({ user: req.user, action: 'order.delete', entity: 'Order', entityId: req.params.id });
  return sendSuccess(res, { message: 'Order deleted', data: { id: req.params.id } });
});
