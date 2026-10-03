import { Bell, MessageSquare, AlertCircle } from "lucide-react";

export default function ParentNotificationsPage() {
  const notifications = [
    {
      id: 1,
      title: "Absensi Berhasil",
      message: "Anak Anda telah hadir di sekolah pada pukul 07:12 WIB.",
      time: "2 jam yang lalu",
      type: "success",
      icon: Bell,
    },
    {
      id: 2,
      title: "Keterlambatan",
      message: "Anak Anda tercatat terlambat 10 menit pada tanggal 12 Mei.",
      time: "1 hari yang lalu",
      type: "warning",
      icon: AlertCircle,
    }
  ];

  return (
    <div className="dashboard-container space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifikasi</h1>
        <p className="text-muted-foreground">
          Pesan dan peringatan otomatis dari sistem sekolah.
        </p>
      </div>

      <div className="space-y-4 max-w-2xl">
        {notifications.map((n) => (
          <div key={n.id} className="flex gap-4 p-4 rounded-xl border bg-card shadow-sm hover:border-primary/50 transition-colors">
            <div className={`p-2 rounded-lg h-fit ${
              n.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
            }`}>
              <n.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-sm">{n.title}</h3>
                <span className="text-xs text-muted-foreground">{n.time}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{n.message}</p>
            </div>
          </div>
        ))}
        
        <div className="p-8 border-2 border-dashed rounded-xl flex flex-col items-center text-center opacity-50">
          <MessageSquare className="h-12 w-12 mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Semua notifikasi sudah dibaca.</p>
        </div>
      </div>
    </div>
  );
}
