import { redirect } from "next/navigation";

export default function TeacherAttendancePage() {
  // Automatically redirect to the new attendance session page
  // since that's the primary action for a teacher clicking this menu.
  redirect("/teacher/attendance/new");
}
