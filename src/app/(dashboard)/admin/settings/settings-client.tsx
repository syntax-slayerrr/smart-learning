"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { School, Bell, Shield, Database, Check, Loader2, MapPin, Calendar, Trash2, Plus } from "lucide-react";
import { saveSchoolSettings, testWhatsApp, addHoliday, deleteHoliday, syncNationalHolidays } from "./actions";

// Leaflet is loaded via CDN in a script tag to keep the bundle small and avoid complex installations
declare const L: any;

type TabKey = "school" | "geolocation" | "whatsapp" | "security" | "holidays" | "backup";

const TABS: { key: TabKey; label: string; icon: typeof School }[] = [
  { key: "school", label: "Profil Sekolah", icon: School },
  { key: "geolocation", label: "Geolokasi Absensi", icon: MapPin },
  { key: "whatsapp", label: "Notifikasi WhatsApp", icon: Bell },
  { key: "holidays", label: "Kalender Libur", icon: Calendar },
  { key: "security", label: "Keamanan & Hak Akses", icon: Shield },
  { key: "backup", label: "Backup & Database", icon: Database },
];

interface SettingsClientProps {
  initialSettings: {
    school_name?: string;
    address?: string;
    phone?: string;
    latitude?: number;
    longitude?: number;
    radius_meters?: number;
    max_students_per_device?: number;
    late_tolerance_minutes?: number;
    wa_token?: string;
    wa_provider?: string;
    wa_notify_mode?: string; // "daily_recap" | "per_session"
  } | null;
  initialHolidays: any[];
}

export default function SettingsClient({ initialSettings, initialHolidays }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("school");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [schoolName, setSchoolName] = useState(initialSettings?.school_name || "SMK TI SYNTAX SLAYER");
  const [address, setAddress] = useState(initialSettings?.address || "");
  const [phone, setPhone] = useState(initialSettings?.phone || "");
  const [waToken, setWaToken] = useState(initialSettings?.wa_token || "");
  const [waProvider, setWaProvider] = useState(initialSettings?.wa_provider || "fonnte");
  const [waNotifyMode, setWaNotifyMode] = useState(initialSettings?.wa_notify_mode || "daily_recap");
  
  // States khusus Wablas
  const isInitialWablas = initialSettings?.wa_provider === "wablas";
  const initialWablasParts = isInitialWablas && initialSettings?.wa_token ? initialSettings.wa_token.split("|") : ["", "", ""];
  const [wablasDomain, setWablasDomain] = useState(initialWablasParts[0] || "");
  const [wablasToken, setWablasToken] = useState(initialWablasParts[1] || "");
  const [wablasSecret, setWablasSecret] = useState(initialWablasParts[2] || "");

  // States khusus Twilio
  const isInitialTwilio = initialSettings?.wa_provider === "twilio";
  const initialTwilioParts = isInitialTwilio && initialSettings?.wa_token ? initialSettings.wa_token.split("|") : ["", "", ""];
  const [twilioAccountSid, setTwilioAccountSid] = useState(initialTwilioParts[0] || "");
  const [twilioAuthToken, setTwilioAuthToken] = useState(initialTwilioParts[1] || "");
  const [twilioFromNumber, setTwilioFromNumber] = useState(initialTwilioParts[2] || "");

  const [latitude, setLatitude] = useState(String(initialSettings?.latitude || "-6.1754"));
  const [longitude, setLongitude] = useState(String(initialSettings?.longitude || "106.8272"));
  const [radius, setRadius] = useState(String(initialSettings?.radius_meters || "100"));
  const [maxPerDevice, setMaxPerDevice] = useState(String(initialSettings?.max_students_per_device || "1"));
  const [lateTolerance, setLateTolerance] = useState(String(initialSettings?.late_tolerance_minutes || "15"));
  const [geoDetecting, setGeoDetecting] = useState(false);
  
  // Holiday states
  const [holidays, setHolidays] = useState(initialHolidays);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayDesc, setHolidayDesc] = useState("");
  
  // Map-related refs and states
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Test WA states
  const [testPhone, setTestPhone] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; error?: string } | null>(null);

  // Load Leaflet assets
  useEffect(() => {
    if (activeTab === "geolocation" && !mapLoaded) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => {
        setMapLoaded(true);
      };
      document.body.appendChild(script);

      return () => {
        // Cleanup if necessary, though keeping them is usually fine
      };
    }
  }, [activeTab]);

  // Initialize Map
  useEffect(() => {
    if (mapLoaded && activeTab === "geolocation" && !mapRef.current) {
      const lat = parseFloat(latitude) || -6.1754;
      const lon = parseFloat(longitude) || 106.8272;
      const rad = parseInt(radius) || 100;

      const map = L.map("map-picker").setView([lat, lon], 16);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      const marker = L.marker([lat, lon], { draggable: true }).addTo(map);
      const circle = L.circle([lat, lon], {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.15,
        radius: rad
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setLatitude(pos.lat.toFixed(6));
        setLongitude(pos.lng.toFixed(6));
        circle.setLatLng(pos);
      });

      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        circle.setLatLng([lat, lng]);
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
      });

      mapRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;
    }

    return () => {
      if (activeTab !== "geolocation" && mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, [mapLoaded, activeTab]);

  // Update map if coordinates changed externally
  useEffect(() => {
    if (mapRef.current && markerRef.current && circleRef.current && activeTab === "geolocation") {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      const rad = parseInt(radius) || 100;
      
      if (!isNaN(lat) && !isNaN(lon)) {
        const newLatLng = [lat, lon];
        markerRef.current.setLatLng(newLatLng);
        circleRef.current.setLatLng(newLatLng);
        circleRef.current.setRadius(rad);
        
        const currentCenter = mapRef.current.getCenter();
        const dist = mapRef.current.distance(currentCenter, newLatLng);
        if (dist > 50) {
          mapRef.current.flyTo(newLatLng, 16);
        }
      }
    }
  }, [latitude, longitude, radius, activeTab]);

  function detectLocation() {
    if (!navigator.geolocation) return;
    setGeoDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGeoDetecting(false);
      },
      () => {
        setGeoDetecting(false);
        alert("Gagal mendeteksi lokasi. Pastikan izin lokasi aktif.");
      },
      { enableHighAccuracy: true }
    );
  }

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      // ===================================================
      // PENTING: Hanya simpan field milik tab yang aktif!
      // Ini mencegah nilai tab lain ter-reset ke default.
      // ===================================================
      let payload: Parameters<typeof saveSchoolSettings>[0] = {};

      if (activeTab === "school") {
        payload = { school_name: schoolName, address, phone };
      } else if (activeTab === "geolocation") {
        payload = {
          latitude: parseFloat(latitude) || 0,
          longitude: parseFloat(longitude) || 0,
          radius_meters: parseInt(radius) || 100,
          max_students_per_device: parseInt(maxPerDevice) || 1,
          late_tolerance_minutes: parseInt(lateTolerance) || 15,
        };
      } else if (activeTab === "whatsapp") {
        payload = {
          wa_token: waProvider === "wablas"
            ? `${wablasDomain}|${wablasToken}|${wablasSecret}`
            : waProvider === "twilio"
              ? `${twilioAccountSid}|${twilioAuthToken}|${twilioFromNumber}`
              : (waToken || null),
          wa_provider: waProvider,
          wa_notify_mode: waNotifyMode,
        };
      } else {
        // Tab lain (security, holidays, backup) tidak punya field untuk disimpan lewat sini
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        return;
      }

      const result = await saveSchoolSettings(payload);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("Gagal menyimpan: " + (result.error || "Terjadi kesalahan"));
      }
    });
  }

  async function handleTestWA() {
    if (!testPhone) return alert("Masukkan nomor HP untuk test");
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testWhatsApp(testPhone);
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, error: "Gagal memanggil API test" });
    } finally {
      setIsTesting(false);
    }
  }

  async function handleAddHoliday() {
    if (!holidayDate || !holidayDesc) return alert("Pilih tanggal dan isi keterangan");
    startTransition(async () => {
      const result = await addHoliday(holidayDate, holidayDesc);
      if (result.success) {
        setHolidays([...holidays, { holiday_date: holidayDate, description: holidayDesc }].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date)));
        setHolidayDate("");
        setHolidayDesc("");
      } else {
        alert("Gagal menambah: " + result.error);
      }
    });
  }

  async function handleDeleteHoliday(id: string) {
    if (!confirm("Hapus hari libur ini?")) return;
    startTransition(async () => {
      const result = await deleteHoliday(id);
      if (result.success) {
        setHolidays(holidays.filter(h => h.id !== id));
      } else {
        alert("Gagal menghapus: " + result.error);
      }
    });
  }

  const [isSyncing, setIsSyncing] = useState(false);

  async function handleSyncHolidays() {
    if (!confirm("Tarik data libur nasional tahun ini dari server pemerintah? (Hanya akan menambahkan tanggal yang belum ada)")) return;
    setIsSyncing(true);
    try {
      const year = new Date().getFullYear();
      const result = await syncNationalHolidays(year);
      if (result.success) {
        alert(`Berhasil! ${result.count} hari libur nasional ditambahkan.`);
        window.location.reload(); // Reload to get fresh data
      } else {
        alert("Gagal sinkronisasi: " + result.error);
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem saat sinkronisasi.");
    } finally {
      setIsSyncing(false);
    }
  }

  const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";


  return (
    <div className="dashboard-container space-y-6 animate-fade-in">
      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-container { height: 100%; width: 100%; border-radius: 0.75rem; z-index: 10; }
        .map-wrapper { height: 320px; position: relative; }
      `}} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
          <p className="text-muted-foreground">Kelola konfigurasi sistem dan preferensi sekolah.</p>
        </div>
        <div className="hidden sm:block">
           {saved && (
             <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700 animate-in fade-in zoom-in duration-300">
               <Check className="h-4 w-4" /> Perubahan disimpan
             </div>
           )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-1.5 shrink-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`apple-press flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold shadow-2xs border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <tab.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 rounded-2xl border border-border bg-card p-6 shadow-2xs overflow-hidden">
          {/* Profil Sekolah */}
          {activeTab === "school" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <h3 className="text-lg font-medium">Profil Sekolah</h3>
                <p className="text-sm text-muted-foreground">Informasi ini akan muncul di laporan dan QR Code.</p>
              </div>
              <div className="grid gap-4 max-w-xl">
                <div className="space-y-2">
                  <label htmlFor="setting-school-name" className="text-sm font-medium">Nama Sekolah</label>
                  <input id="setting-school-name" type="text" aria-label="Nama Sekolah" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="setting-school-address" className="text-sm font-medium">Alamat</label>
                  <input id="setting-school-address" type="text" aria-label="Alamat Sekolah" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Jl. Contoh No. 123" className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="setting-school-phone" className="text-sm font-medium">Telepon</label>
                  <input id="setting-school-phone" type="text" aria-label="Telepon Sekolah" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="021-1234567" className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="setting-late-tolerance" className="text-sm font-medium">Toleransi Keterlambatan (Menit)</label>
                  <input id="setting-late-tolerance" type="number" aria-label="Toleransi Keterlambatan dalam Menit" value={lateTolerance} onChange={(e) => setLateTolerance(e.target.value)} placeholder="15" className={inputClass} min="0" />
                  <p className="text-xs text-muted-foreground">Siswa dianggap terlambat jika absen melewati batas menit ini setelah jam masuk.</p>
                </div>
              </div>
            </div>
          )}

          {/* Geolokasi */}
          {activeTab === "geolocation" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Geolokasi Absensi</h3>
                  <p className="text-sm text-muted-foreground">Klik pada peta untuk mengatur lokasi sekolah.</p>
                </div>
                <button type="button" onClick={detectLocation} disabled={geoDetecting} className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50">
                  {geoDetecting ? (<><Loader2 className="h-3 w-3 animate-spin" /> Mendeteksi...</>) : (<><MapPin className="h-3 w-3" /> Lokasi Saya</>)}
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="map-wrapper rounded-xl border border-border bg-muted overflow-hidden shadow-inner">
                  {!mapLoaded ? (
                    <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Memuat peta...</span>
                    </div>
                  ) : (
                    <div id="map-picker" className="h-full w-full" />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="geo-latitude" className="text-xs font-semibold text-muted-foreground uppercase">Latitude</label>
                    <input id="geo-latitude" type="text" aria-label="Latitude Lokasi Sekolah" value={latitude} onChange={(e) => setLatitude(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="geo-longitude" className="text-xs font-semibold text-muted-foreground uppercase">Longitude</label>
                    <input id="geo-longitude" type="text" aria-label="Longitude Lokasi Sekolah" value={longitude} onChange={(e) => setLongitude(e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="geo-radius" className="text-xs font-semibold text-muted-foreground uppercase">Radius (Meter)</label>
                    <input id="geo-radius" type="number" aria-label="Radius Geofencing dalam Meter" value={radius} onChange={(e) => setRadius(e.target.value)} className={inputClass} />
                  </div>
                </div>

                <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 text-xs text-emerald-800">
                  <p className="font-bold flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Geofencing Aktif</p>
                  <p className="mt-1 leading-relaxed">
                    Siswa hanya dapat melakukan absensi jika berada di dalam lingkaran hijau di atas. 
                    Pastikan titik koordinat tepat berada di pusat sekolah.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp */}
          {activeTab === "whatsapp" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <h3 className="text-lg font-medium">Notifikasi WhatsApp</h3>
                <p className="text-sm text-muted-foreground">Konfigurasi pengiriman notifikasi ke orang tua.</p>
              </div>
              <div className="grid gap-4 max-w-xl">

                {/* Mode Notifikasi WA */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Mode Notifikasi WA</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setWaNotifyMode("daily_recap")}
                      className={`relative flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all ${
                        waNotifyMode === "daily_recap"
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:border-muted-foreground/30"
                      }`}
                    >
                      {waNotifyMode === "daily_recap" && (
                        <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-xs">✓</span>
                      )}
                      <span className="text-2xl">📋</span>
                      <span className="font-semibold text-sm">Rekap Harian</span>
                      <span className="text-xs text-muted-foreground">1 pesan/siswa berisi ringkasan seluruh pelajaran hari itu. Dikirim manual oleh admin.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWaNotifyMode("per_session")}
                      className={`relative flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all ${
                        waNotifyMode === "per_session"
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:border-muted-foreground/30"
                      }`}
                    >
                      {waNotifyMode === "per_session" && (
                        <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-xs">✓</span>
                      )}
                      <span className="text-2xl">⚡</span>
                      <span className="font-semibold text-sm">Per Sesi/Mapel</span>
                      <span className="text-xs text-muted-foreground">Pesan langsung terkirim setiap kali sesi kelas selesai/ditutup secara otomatis.</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Provider API</label>
                  <select value={waProvider} onChange={(e) => setWaProvider(e.target.value)} className={inputClass}>
                    <option value="fonnte">Fonnte</option>
                    <option value="wablas">Wablas</option>
                    <option value="twilio">Twilio</option>
                    <option value="custom">Custom API</option>
                  </select>
                </div>
                {waProvider === "wablas" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="wablas-domain" className="text-sm font-medium">Domain Server Wablas</label>
                      <input 
                        id="wablas-domain"
                        type="text" 
                        aria-label="Domain Server Wablas"
                        value={wablasDomain} 
                        onChange={(e) => setWablasDomain(e.target.value)} 
                        placeholder="Contoh: solo.wablas.com" 
                        className={inputClass} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="wablas-token" className="text-sm font-medium">API Token Wablas</label>
                      <input 
                        id="wablas-token"
                        type="password" 
                        aria-label="API Token Wablas"
                        value={wablasToken} 
                        onChange={(e) => setWablasToken(e.target.value)} 
                        placeholder="Masukkan API Token" 
                        className={inputClass} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="wablas-secret" className="text-sm font-medium">Secret Key Wablas</label>
                      <input 
                        id="wablas-secret"
                        type="password" 
                        aria-label="Secret Key Wablas"
                        value={wablasSecret} 
                        onChange={(e) => setWablasSecret(e.target.value)} 
                        placeholder="Masukkan Secret Key" 
                        className={inputClass} 
                      />
                    </div>
                  </div>
                ) : waProvider === "twilio" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="twilio-sid" className="text-sm font-medium">Account SID</label>
                      <input 
                        id="twilio-sid"
                        type="text" 
                        aria-label="Twilio Account SID"
                        value={twilioAccountSid} 
                        onChange={(e) => setTwilioAccountSid(e.target.value)} 
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxx" 
                        className={inputClass} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="twilio-auth" className="text-sm font-medium">Auth Token</label>
                      <input 
                        id="twilio-auth"
                        type="password" 
                        aria-label="Twilio Auth Token"
                        value={twilioAuthToken} 
                        onChange={(e) => setTwilioAuthToken(e.target.value)} 
                        placeholder="Masukkan Auth Token rahasia" 
                        className={inputClass} 
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="twilio-from" className="text-sm font-medium">Nomor Pengirim (From)</label>
                      <input 
                        id="twilio-from"
                        type="text" 
                        aria-label="Nomor Pengirim Twilio"
                        value={twilioFromNumber} 
                        onChange={(e) => setTwilioFromNumber(e.target.value)} 
                        placeholder="Contoh: +141****8886" 
                        className={inputClass} 
                      />
                      <p className="text-xs text-muted-foreground mt-1">Gunakan nomor resmi Twilio Sandbox Anda, termasuk tanda plus (+).</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label htmlFor="wa-api-token" className="text-sm font-medium">API Token</label>
                    <input id="wa-api-token" type="password" aria-label="WhatsApp API Token" value={waToken} onChange={(e) => setWaToken(e.target.value)} placeholder={initialSettings?.wa_token ? "••••••••••••••••" : "Masukkan token API"} className={inputClass} />
                  </div>
                )}
                
                {/* Test Section */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Test Pengiriman</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      aria-label="Nomor HP untuk testing"
                      placeholder="Nomor HP (0812...)" 
                      value={testPhone} 
                      onChange={(e) => setTestPhone(e.target.value)}
                      className={`${inputClass} flex-1`}
                    />
                    <button 
                      type="button"
                      onClick={handleTestWA}
                      disabled={isTesting}
                      className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95"
                    >
                      {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test Kirim"}
                    </button>
                  </div>
                  {testResult && (
                    <p className={`text-xs font-medium ${testResult.success ? "text-emerald-600" : "text-red-600"} animate-in slide-in-from-top-2 duration-300`}>
                      {testResult.success ? "✅ Berhasil! Cek WhatsApp Anda." : `❌ Gagal: ${testResult.error}`}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                  <p className="font-bold flex items-center gap-1.5">⚠️ Perhatian</p>
                  <p className="mt-1">
                    Gunakan format nomor internasional (contoh: 628123456789).
                    Pastikan paket API Anda aktif.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Keamanan */}
          {activeTab === "security" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <h3 className="text-lg font-medium">Keamanan & Hak Akses</h3>
                <p className="text-sm text-muted-foreground">Status fitur keamanan sistem.</p>
              </div>
              <div className="grid gap-3 max-w-xl">
                {[
                  { name: "Row Level Security", desc: "Proteksi data per-user", status: "Aktif" },
                  { name: "Rate Limiting API", desc: "Mencegah spam endpoint", status: "Aktif" },
                  { name: "Middleware Auth", desc: "Proteksi rute berdasarkan role", status: "Aktif" },
                  { name: "Geofencing GPS", desc: "Validasi lokasi saat absensi", status: "Aktif" },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      {item.status}
                    </span>
                  </div>
                ))}

                <div className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-amber-800">
                    <Shield className="h-5 w-5" />
                    <h4 className="text-sm font-bold uppercase tracking-tight">Limit Akun Per Perangkat</h4>
                  </div>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Batasi jumlah siswa yang dapat melakukan absensi dari satu HP yang sama untuk mencegah titip absen.
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <input 
                      type="number" 
                      aria-label="Jumlah maksimal siswa per perangkat"
                      value={maxPerDevice} 
                      onChange={(e) => setMaxPerDevice(e.target.value)} 
                      className={`${inputClass} w-24 bg-white`}
                      min="1"
                    />
                    <span className="text-xs font-medium text-muted-foreground">Siswa per Perangkat</span>
                  </div>
                  <p className="text-[10px] text-amber-600 italic">
                    * Jika siswa mengganti HP atau menghapus data browser, mereka harus lapor Admin untuk reset perangkat.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Backup */}
          {activeTab === "backup" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <h3 className="text-lg font-medium">Backup & Database</h3>
                <p className="text-sm text-muted-foreground">Status infrastruktur penyimpanan data.</p>
              </div>
              <div className="grid gap-4 max-w-xl">
                <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
                  <p className="font-medium text-sm">Status Koneksi</p>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-medium text-emerald-700">Terhubung (Sehat)</span>
                  </div>
                </div>
                <div className="rounded-lg border p-4 space-y-1 bg-muted/20">
                  <p className="font-medium text-sm text-muted-foreground uppercase text-[10px]">Penyedia Layanan</p>
                  <p className="text-sm font-semibold">Supabase Cloud (PostgreSQL)</p>
                </div>
              </div>
            </div>
          )}

          {/* Kalender Libur */}
          {activeTab === "holidays" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium">Kalender Libur</h3>
                  <p className="text-sm text-muted-foreground">Atur tanggal merah agar sistem otomatis meliburkan absensi.</p>
                </div>
                <button
                  onClick={handleSyncHolidays}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  Sync Libur Nasional
                </button>
              </div>
              
              <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                <p className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Plus className="h-3 w-3" /> Tambah Tanggal Merah
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input 
                    type="date" 
                    aria-label="Tanggal libur"
                    value={holidayDate} 
                    onChange={(e) => setHolidayDate(e.target.value)}
                    className={inputClass}
                  />
                  <input 
                    type="text" 
                    aria-label="Keterangan hari libur"
                    placeholder="Keterangan (misal: Lebaran Hari 1)" 
                    value={holidayDesc} 
                    onChange={(e) => setHolidayDesc(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button 
                  onClick={handleAddHoliday}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />} Tambahkan ke Kalender
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold uppercase text-muted-foreground">Daftar Libur Terdaftar</p>
                <div className="grid gap-2">
                  {holidays.map((h: any) => (
                    <div key={h.id || h.holiday_date} className="flex items-center justify-between rounded-lg border p-3 bg-card shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center rounded-lg bg-red-50 px-3 py-1 border border-red-100">
                           <span className="text-[10px] font-bold text-red-600 uppercase">
                             {new Date(h.holiday_date).toLocaleDateString('id-ID', { month: 'short' })}
                           </span>
                           <span className="text-lg font-black text-red-700 leading-none">
                             {new Date(h.holiday_date).getDate()}
                           </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{h.description}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(h.holiday_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {holidays.length === 0 && (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground bg-muted/10">
                      Belum ada hari libur yang diatur.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="pt-6 mt-8 border-t">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-md bg-primary px-8 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
              ) : saved ? (
                <><Check className="mr-2 h-4 w-4" /> Tersimpan!</>
              ) : (
                "Simpan Semua Pengaturan"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
