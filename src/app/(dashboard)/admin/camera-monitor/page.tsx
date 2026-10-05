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
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-28 sm:pb-12 animate-fade-in">
      <PageHeader
        title="AI Classroom Vision & Live Monitor"
        description="Pusat pemantauan visual kelas real-time berbasis computer vision AI dan telemetri kehadiran cerdas."
      />

      {/* AI Live Command Center */}
      <LiveCameraMonitor />

      {/* AI Classroom Dynamics & Early Warning */}
      <ClassroomIntelligenceOverview data={schoolOverview} />
    </div>
  );
}
