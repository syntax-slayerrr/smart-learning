import { PageHeader } from "@/components/shared/page-header";
import { LiveCameraMonitor } from "@/components/dashboard/live-camera-monitor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI Classroom Vision & Live Monitor — Guru | Smart Learning",
  description: "Pemantauan visual kelas real-time, deteksi atensi siswa, dan telemetri kehadiran AI.",
};

export default function TeacherCameraMonitorPage() {
  return (
    <div className="dashboard-container max-w-7xl space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="FITUR UNGGULAN KELAS"
        title="AI Classroom Vision & Live Monitor"
        description="Pantau konsentrasi, atensi, dan partisipasi siswa di kelas secara real-time dengan bantuan AI Vision."
      />

      {/* Main AI Live Monitoring Command Center */}
      <LiveCameraMonitor />
    </div>
  );
}
