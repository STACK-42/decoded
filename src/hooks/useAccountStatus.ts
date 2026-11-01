import { useSyncExternalStore } from "react";
import { getAccountProfile, getAccountStatus, getEnrollments, subscribeAccountStatus } from "@/lib/progressSync";

export function useAccountStatus() {
  return useSyncExternalStore(subscribeAccountStatus, getAccountStatus);
}

export function useAccountProfile() {
  return useSyncExternalStore(subscribeAccountStatus, getAccountProfile);
}

export function useEnrollments() {
  return useSyncExternalStore(subscribeAccountStatus, getEnrollments);
}
