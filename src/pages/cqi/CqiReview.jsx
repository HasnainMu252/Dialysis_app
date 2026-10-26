import PageHeader from '../../components/common/PageHeader';
import CqiReviewPanel from '../../components/common/CqiReviewPanel';

export default function CqiReview() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="CQI Review"
        subtitle="All CQI comments across patients — filter by month and role, review and export."
      />
      <CqiReviewPanel />
    </div>
  );
}
