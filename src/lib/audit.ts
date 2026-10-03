// ============================================
// Audit Logger — SYNTAX SLAYER
// Logs critical system events to the audit_logs table.
// ============================================

import { createClient } from "@/lib/supabase/server";

export type AuditAction =
  | "user.login"
  | "user.logout"
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "attendance.session_created"
  | "attendance.session_closed"
  | "attendance.recorded"
  | "attendance.manual_override"
  | "class.created"
  | "class.updated"
  | "class.deleted"
  | "notification.sent"
  | "notification.failed"
  | "system.config_changed"
  | "system.error";

interface AuditLogParams {
  userId?: string;
  action: AuditAction;
  tableName: string;
  recordId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Write an entry to the audit_logs table.
 * This function is fire-and-forget — it never throws.
 * 
 * @example
 * ```ts
 * await writeAuditLog({
 *   userId: user.id,
 *   action: "attendance.recorded",
 *   tableName: "attendance_records",
 *   recordId: record.id,
 *   newData: { status: "present", student_id: "..." },
 * });
 * ```
 */
export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from("audit_logs").insert({
      user_id: params.userId || null,
      action: params.action,
      table_name: params.tableName,
      record_id: params.recordId || null,
      old_data: params.oldData || null,
      new_data: params.newData || null,
      ip_address: params.ipAddress || null,
    });
  } catch (err) {
    // Never throw from audit — log to console as fallback
    console.error("[Audit] Failed to write log:", err);
  }
}

/**
 * Convenience: log an attendance event.
 */
export async function logAttendanceEvent(
  userId: string,
  action: "attendance.recorded" | "attendance.session_created" | "attendance.session_closed" | "attendance.manual_override",
  recordId: string,
  data: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  await writeAuditLog({
    userId,
    action,
    tableName: action.includes("session") ? "attendance_sessions" : "attendance_records",
    recordId,
    newData: data,
    ipAddress,
  });
}

/**
 * Convenience: log a notification event.
 */
export async function logNotificationEvent(
  notificationId: string,
  success: boolean,
  details?: Record<string, unknown>
): Promise<void> {
  await writeAuditLog({
    action: success ? "notification.sent" : "notification.failed",
    tableName: "notifications",
    recordId: notificationId,
    newData: details,
  });
}
