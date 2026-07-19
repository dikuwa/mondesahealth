export type AppointmentAction = "CONFIRM" | "CANCEL" | "COMPLETE" | "NO_SHOW";
const transitions: Record<AppointmentAction, string[]> = {
  CONFIRM: ["NEW_REQUEST", "PENDING_CONFIRMATION", "REVIEW_REQUIRED"],
  CANCEL: [
    "NEW_REQUEST",
    "PENDING_CONFIRMATION",
    "CONFIRMED",
    "RESCHEDULE_PROPOSED",
    "RESCHEDULE_REQUESTED",
    "REVIEW_REQUIRED",
  ],
  COMPLETE: ["CONFIRMED", "REVIEW_REQUIRED"],
  NO_SHOW: ["CONFIRMED", "REVIEW_REQUIRED"],
};
export const canTransition = (status: string, action: AppointmentAction) =>
  transitions[action].includes(status);
export const nextAppointmentStatus = (action: AppointmentAction) =>
  ({
    CONFIRM: "CONFIRMED",
    CANCEL: "CANCELLED",
    COMPLETE: "COMPLETED",
    NO_SHOW: "NO_SHOW",
  })[action];
