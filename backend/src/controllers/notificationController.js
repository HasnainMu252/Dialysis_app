import asyncHandler from 'express-async-handler';
import Notification from '../models/Notification.js';
import Patient from '../models/Patient.js';

export const getMyNotifications = asyncHandler(async (req, res) => {
  const role = req.user?.role;
  const userId = req.user?._id;

  const notifications = await Notification.find({
    $or: [
      { roles: role },
      { createdForUsers: userId },
    ],
  })
    .populate('patient', 'mrn firstName lastName insurance')
    .populate('schedule', 'code date startTime endTime chairCode status')
    .populate('insuranceForm', 'dueDate approvalStatus formStatus')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications,
    message: 'Notifications fetched',
    errors: [],
  });
});

export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({
      success: false,
      data: {},
      message: 'Notification not found',
      errors: [],
    });
  }

  const alreadyRead = notification.isReadBy.some(
    (item) => item.user.toString() === req.user._id.toString()
  );

  if (!alreadyRead) {
    notification.isReadBy.push({
      user: req.user._id,
      readAt: new Date(),
    });

    await notification.save();
  }

  res.status(200).json({
    success: true,
    data: notification,
    message: 'Notification marked as read',
    errors: [],
  });
});

export const forceNotification = asyncHandler(async (req, res) => {
  const {
    title,
    message,
    roles = [],
    priority = 'normal',
    patient,
  } = req.body;

  if (!title || !message || !roles.length) {
    return res.status(400).json({
      success: false,
      data: {},
      message: 'title, message and roles are required',
      errors: [],
    });
  }

  const notification = await Notification.create({
    title,
    message,
    roles,
    priority,
    patient,
    type: 'general',
  });

  res.status(201).json({
    success: true,
    data: notification,
    message: 'Notification sent successfully',
    errors: [],
  });
});

export const testInsuranceExpiryNotification = asyncHandler(async (req, res) => {
  const { patientId, days = 15 } = req.body;

  const patient = await Patient.findById(patientId).select(
    'mrn firstName lastName insurance'
  );

  if (!patient) {
    return res.status(404).json({
      success: false,
      data: {},
      message: 'Patient not found',
      errors: [],
    });
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + Number(days));

  const notification = await Notification.create({
    title: 'Insurance Expiry Alert',
    message: `${patient.firstName} ${patient.lastName} insurance expires in ${days} days.`,
    type: 'insurance_expiry',
    priority: Number(days) <= 15 ? 'urgent' : 'high',
    patient: patient._id,
    roles: ['admin', 'biller', 'front_desk'],
    dueDate,
  });

  res.status(201).json({
    success: true,
    data: notification,
    message: 'Test insurance expiry notification created',
    errors: [],
  });
});