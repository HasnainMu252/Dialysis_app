import PageHeader from '../../components/common/PageHeader';
import CqiReviewPanel from '../../components/common/CqiReviewPanel';

/*
 * Doctor CQI view — one systematic, filterable list of CQI entries across all
 * patients. Every clinical role (doctor, nurse, technician, social worker,
 * dietitian) submits a single CQI comment on the patient's CQI tab; they are
 * all collected here and reviewed by the DON / Admin. Filter by month, year
 * and role at the top; only entries that actually exist are shown.
 */
export default function CqiPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="CQI Tracking"
        subtitle="One continuous-quality log across all patients — filter by month, year and role. Entries are added from each patient's CQI tab and reviewed by the DON / Admin."
      />
      <CqiReviewPanel />
    </div>
  );
}
