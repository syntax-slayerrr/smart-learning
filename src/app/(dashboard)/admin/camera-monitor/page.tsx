import { PageHeader } from "@/components/shared/page-header";
import { LiveCameraMonitor } from "@/components/dashboard/live-camera-monitor";
import { ClassroomIntelligenceOverview } from "@/components/dashboard/classroom-intelligence-overview";
import { getSchoolOverview } from "@/services/student-analytics";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI Classroom Vision & Live Monitor | Smart Learning",
  description: "Pusat komando telemetri visual AI, deteksi atensi, dan live streaming kamera kelas.",
};

export default async function CameraMonitorPage() {
  const schoolOverview = await getSchoolOverview();

  return (
    <div className="dashboard-container max-w-7xl space-y-6 animate-fade-in">
      <PageHeader
        title="AI Classroom Vision"
        description="Monitoring visual aktivitas kelas real-time berbasis AI Edge dan presensi otomatis."
      />

      {/* Main AI Live Monitoring Command Center */}
      <LiveCameraMonitor />

      {/* Classroom Behavior Intelligence & Early Warning */}
      <ClassroomIntelligenceOverview data={schoolOverview} />
    </div>
  );
}
