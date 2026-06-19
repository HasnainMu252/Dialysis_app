import InsuranceForm from '../models/InsuranceForm.js';
import Notification from '../models/Notification.js';
import Patient from '../models/Patient.js';

const createExpiryNotification = async ({ patient, insuranceForm, dueDate }) => {
  const patientName = patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Patient';

  const exists = await Notification.exists({
    type: 'insurance_expiry',
    patient: patient?._id,
    dueDate,
    roles: 'biller',
  });

  if (exists) return false;

  await Notification.create({
    title: 'Insurance Expiry Reminder',
    message: `Insurance approval for ${patientName} is expiring within 30 days. Please review and renew before due date.`,
    type: 'insurance_expiry',
    patient: patient?._id,
    insuranceForm: insuranceForm?._id,
    roles: ['admin', 'biller', 'insurance'],
    dueDate,
  });

  return true;
};

export const checkInsuranceExpiryNotifications = async () => {
  const today = new Date();
  const next30Days = new Date();
  next30Days.setDate(today.getDate() + 30);

  const [forms, patients] = await Promise.all([
    InsuranceForm.find({
      $or: [
        { dueDate: { $gte: today, $lte: next30Days } },
        { approvalValidTo: { $gte: today, $lte: next30Days } },
      ],
      approvalStatus: { $in: ['approved', 'submitted'] },
      sentExpiryNotification30Days: false,
    }).populate('patient', 'mrn firstName lastName').lean(false),
    Patient.find({
      'insurance.approvalValidTo': { $gte: today, $lte: next30Days },
      'insurance.approvalStatus': { $in: ['approved', 'submitted'] },
    }).select('mrn firstName lastName insurance.approvalValidTo').lean(),
  ]);

  let created = 0;

  for (const form of forms) {
    const dueDate = form.dueDate || form.approvalValidTo;
    if (await createExpiryNotification({ patient: form.patient, insuranceForm: form, dueDate })) created += 1;
    form.sentExpiryNotification30Days = true;
    await form.save();
  }

  for (const patient of patients) {
    if (await createExpiryNotification({ patient, dueDate: patient.insurance?.approvalValidTo })) created += 1;
  }

  return created;
};
