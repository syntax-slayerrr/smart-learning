import { redirect } from "next/navigation";

export default function StudentAttendanceRedirect() {
  redirect("/student/history");
}
