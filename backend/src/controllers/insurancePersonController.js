import asyncHandler from 'express-async-handler';
import Patient from '../models/Patient.js';
import InsuranceForm from '../models/InsuranceForm.js';

const daysBetween = (date) => {
  if (!date) return null;

  const today = new Date();
  const target = new Date(date);

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

export const getInsurancePersonDashboard = asyncHandler(async (_req, res) => {
  const patients = await Patient.find({ status: 'active' })
    .select('mrn firstName lastName phone insurance status createdAt')
    .sort({ createdAt: -1 })
    .lean();

  const forms = await InsuranceForm.find({})
    .populate('patient', 'mrn firstName lastName phone status')
    .select('patient patientMrn approvalStatus formStatus dueDate approvalValidTo documents createdAt updatedAt')
    .sort({ dueDate: 1 })
    .lean();

  const expiryList = forms.map((form) => {
    const expiryDate = form.dueDate || form.approvalValidTo;
    const daysLeft = daysBetween(expiryDate);

    return {
      _id: form._id,
      patient: form.patient,
      patientMrn: form.patientMrn,
      approvalStatus: form.approvalStatus,
      formStatus: form.formStatus,
      expiryDate,
      daysLeft,
      documentsCount: form.documents?.length || 0,
      level:
        daysLeft === null
          ? 'unknown'
          : daysLeft < 0
            ? 'expired'
            : daysLeft <= 15
              ? 'critical'
              : daysLeft <= 30
                ? 'warning'
                : daysLeft <= 180
                  ? 'six_months'
                  : 'normal',
    };
  });

  const expired = expiryList.filter((item) => item.level === 'expired');
  const critical15Days = expiryList.filter((item) => item.level === 'critical');
  const oneMonth = expiryList.filter((item) => item.level === 'warning');
  const sixMonths = expiryList.filter((item) => item.level === 'six_months');

  res.status(200).json({
    success: true,
    data: {
      totalPatients: patients.length,
      totalInsuranceForms: forms.length,
      expiredCount: expired.length,
      critical15DaysCount: critical15Days.length,
      oneMonthCount: oneMonth.length,
      sixMonthsCount: sixMonths.length,
      expired,
      critical15Days,
      oneMonth,
      sixMonths,
      expiryList,
    },
    message: 'Insurance person dashboard fetched successfully',
    errors: [],
  });
});