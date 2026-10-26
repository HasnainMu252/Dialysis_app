import asyncHandler from 'express-async-handler';
import InventoryItem from '../models/InventoryItem.js';
import { ApiError } from '../utils/apiError.js';
import { writeAudit } from '../utils/audit.js';

/** GET /inventory?category= */
export const listInventory = asyncHandler(async (req, res) => {
  const q = {};
  if (req.query.category) q.category = req.query.category;
  const items = await InventoryItem.find(q).sort('name').lean();
  res.json({ success: true, data: items, meta: { total: items.length }, message: 'Inventory', errors: [] });
});

/** POST /inventory */
export const createInventory = asyncHandler(async (req, res) => {
  const { name } = req.body || {};
  if (!String(name || '').trim()) throw new ApiError(400, 'Item name is required');
  const item = await InventoryItem.create({ ...req.body, name: String(name).trim() });
  await writeAudit({ user: req.user, action: 'inventory.create', entity: 'InventoryItem', entityId: item._id });
  res.status(201).json({ success: true, data: item, message: 'Item added', errors: [] });
});

/** PATCH /inventory/:id */
export const updateInventory = asyncHandler(async (req, res) => {
  const { transactions, quantityOnHand, ...rest } = req.body || {}; // stock changes go through /transaction
  const item = await InventoryItem.findByIdAndUpdate(req.params.id, rest, { new: true, runValidators: true });
  if (!item) throw new ApiError(404, 'Item not found');
  await writeAudit({ user: req.user, action: 'inventory.update', entity: 'InventoryItem', entityId: item._id });
  res.json({ success: true, data: item, message: 'Item updated', errors: [] });
});

/** DELETE /inventory/:id */
export const deleteInventory = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findByIdAndDelete(req.params.id);
  if (!item) throw new ApiError(404, 'Item not found');
  await writeAudit({ user: req.user, action: 'inventory.delete', entity: 'InventoryItem', entityId: req.params.id });
  res.json({ success: true, data: { id: req.params.id }, message: 'Item deleted', errors: [] });
});

/** POST /inventory/:id/transaction  — purchase (+), usage (-), adjustment (signed) */
export const addTransaction = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Item not found');

  const { type = 'purchase', quantity = 0, note = '', date } = req.body || {};
  const qty = Number(quantity) || 0;
  if (!['purchase', 'usage', 'adjustment'].includes(type)) throw new ApiError(400, 'Invalid transaction type');

  const delta = type === 'usage' ? -Math.abs(qty) : type === 'purchase' ? Math.abs(qty) : qty;
  item.quantityOnHand = (item.quantityOnHand || 0) + delta;

  item.transactions.push({
    type,
    quantity: qty,
    note: String(note).trim(),
    date: date ? new Date(date) : new Date(),
    by: req.user?._id,
    byName: req.user?.name,
  });
  await item.save();

  await writeAudit({ user: req.user, action: 'inventory.transaction', entity: 'InventoryItem', entityId: item._id });
  res.json({ success: true, data: item, message: 'Stock updated', errors: [] });
});
