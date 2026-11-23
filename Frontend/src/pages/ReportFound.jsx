import PageHeader from "../components/PageHeader.jsx";
import ReportForm from "../components/ReportForm.jsx";

export default function ReportFound() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <PageHeader title="Report a Found Item" subtitle="Provide details about the item you have found" />
      <ReportForm type="found" />
    </div>
  );
}
