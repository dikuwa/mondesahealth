export const INTAKE_CONSENT_VERSION = "2026-07-19";
export const INTAKE_SAFETY_POLICY_VERSION = "2026-07-19";

const rules = [
  ["BREATHING_DIFFICULTY", /\b(can(?:not|'t) breathe|severe (?:difficulty|trouble) breathing|struggling to breathe|choking)\b/i],
  ["LOSS_OF_CONSCIOUSNESS", /\b(unconscious|not waking|passed out and (?:won't|will not) wake|loss of consciousness)\b/i],
  ["HEAVY_BLEEDING", /\b(heavy|uncontrolled|won't stop|will not stop) bleeding\b/i],
  ["POSSIBLE_STROKE", /\b(face droop|one[- ]sided weakness|sudden slurred speech|cannot raise (?:my|their) arm)\b/i],
  ["SEVERE_CHEST_PAIN", /\b(severe|crushing|tightening) chest pain\b/i],
  ["SERIOUS_HEAD_INJURY", /\b(serious head injury|hit (?:my|their) head.*(?:unconscious|vomiting|confused))\b/i],
  ["ACTIVE_SEIZURE", /\b(having a seizure|seizure (?:right now|now)|continuous seizure)\b/i],
  ["SELF_HARM_DANGER", /\b(kill myself|end my life|hurt myself right now|suicide plan)\b/i],
  ["SEVERE_ALLERGIC_REACTION", /\b(anaphylaxis|throat (?:is )?closing|swollen tongue.*(?:breathe|breathing))\b/i],
] as const;

export function detectRedFlags(text: string) {
  const bounded = text.slice(0, 12_000);
  return rules.filter(([, pattern]) => pattern.test(bounded)).map(([category]) => category);
}

export function aiIntakeAvailable(input: {
  globalEnabled: boolean;
  serviceEnabled?: boolean | null;
  providerEnabled?: boolean | null;
}) {
  return input.globalEnabled && input.serviceEnabled !== false && input.providerEnabled !== false;
}
