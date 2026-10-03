import { getSchoolSettings, getHolidays } from "./actions";
import SettingsClient from "./settings-client";

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const [settings, holidays] = await Promise.all([
    getSchoolSettings(),
    getHolidays(),
  ]);

  return <SettingsClient initialSettings={settings} initialHolidays={holidays} />;
}
