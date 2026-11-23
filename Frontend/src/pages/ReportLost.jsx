import PageHeader from "../components/PageHeader.jsx";
import ReportForm from "../components/ReportForm.jsx";

export default function ReportLost() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <PageHeader title="Report a Lost Item" subtitle="Provide details about the item you have lost" />
      <ReportForm type="lost" />
    </div>
  );
}
