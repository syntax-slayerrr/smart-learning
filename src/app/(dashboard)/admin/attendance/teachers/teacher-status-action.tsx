"use client";

import { useTransition } from "react";
import { toggleTeacherPresence } from "./actions";
import { Loader2, RefreshCw } from "lucide-react";

interface TeacherStatusActionProps {
  sessionId: string;
  currentPresence: string | null;
}

export function TeacherStatusAction({ sessionId, currentPresence }: TeacherStatusActionProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleTeacherPresence(sessionId, currentPresence);
      if (result?.error) {
        alert("Gagal mengubah status: " + result.error);
      }
    });
  };

  return (
    <button 
      onClick={handleToggle} 
      disabled={isPending}
      className={`inline-flex items-center justify-center p-2 rounded-md transition-colors 
        ${isPending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'}
      `}
      title={currentPresence ? "Ubah jadi Tidak Hadir" : "Ubah jadi Hadir"}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <RefreshCw className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
      )}
    </button>
  );
}
