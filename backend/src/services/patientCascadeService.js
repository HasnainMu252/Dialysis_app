import Schedule from '../models/Schedule.js';
import DialysisSession from '../models/DialysisSession.js';
import MedicationAdministration from '../models/MedicationAdministration.js';
import HomeMedication from '../models/HomeMedication.js';
import LabReport from '../models/LabReport.js';
import CqiComment from '../models/CqiComment.js';
import DoctorCheckup from '../models/DoctorCheckup.js';
import DialysisPrescription from '../models/DialysisPrescription.js';
import BillingClaim from '../models/BillingClaim.js';
import InsuranceForm from '../models/InsuranceForm.js';
import Notification from '../models/Notification.js';

/**
 * Remove every record tied to the given patient id(s). Called when a patient is
 * deleted so nothing is left orphaned — in particular schedules and dialysis
 * sessions, which otherwise show as "Unknown patient" in the treatment flow.
 *
 * Accepts a single id or an array. Returns a per-collection deleted count.
 * Best-effort: a failure in one collection doesn't stop the others.
 */
export const cascadeDeletePatientData = async (patientIds) => {
  const ids = Array.isArray(patientIds) ? patientIds : [patientIds];
  if (!ids.length) return {};

  const filter = { patient: { $in: ids } };

  const collections = [
    ['sessions', DialysisSession],
    ['schedules', Schedule],
    ['medications', MedicationAdministration],
    ['homeMedications', HomeMedication],
    ['labReports', LabReport],
    ['cqiComments', CqiComment],
    ['doctorCheckups', DoctorCheckup],
    ['prescriptions', DialysisPrescription],
    ['billingClaims', BillingClaim],
    ['insuranceForms', InsuranceForm],
    ['notifications', Notification],
  ];

  const result = {};
  for (const [name, Model] of collections) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const r = await Model.deleteMany(filter);
      result[name] = r.deletedCount || 0;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`cascadeDeletePatientData: ${name} cleanup failed: ${err.message}`);
      result[name] = 0;
    }
  }
  return result;
};
