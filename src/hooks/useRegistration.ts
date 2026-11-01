import { useAccountStatus, useEnrollments } from "@/hooks/useAccountStatus";
import { useProgress } from "@/hooks/useProgress";

export function useRegistration(courseSlug: string) {
  const status = useAccountStatus();
  const enrollments = useEnrollments();
  const { completed } = useProgress(courseSlug);
  const registeredAt = enrollments[courseSlug] ?? null;
  return {
    status,
    registeredAt,
    // Without the API nobody can register, so progress stays on the device as it did before accounts.
    registered: registeredAt !== null || completed.length > 0 || status === "unavailable",
  };
}
