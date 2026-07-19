import { afterEach, describe, expect, it, vi } from "vitest";
import { aiCapabilities, clinicianAssistantSchema, patientAssistantSchema, patientSummarySchema, requestStructuredAi } from "./ai-provider";

afterEach(() => { delete process.env.AI_API_KEY; delete process.env.AI_MODEL; delete process.env.AI_PROVIDER; vi.unstubAllGlobals(); });

describe("structured AI adapter", () => {
  it("reports no capabilities and fails safely without server configuration", async () => {
    expect(aiCapabilities()).toEqual({ configured: false, imageInput: false, capabilities: [] });
    await expect(requestStructuredAi({ system: "safe", payload: {}, schema: patientAssistantSchema })).rejects.toThrow("AI_NOT_CONFIGURED");
  });
  it("validates structured patient and clinician output", () => {
    expect(patientAssistantSchema.safeParse({ nextQuestion: "When did it start?", enoughInformation: false, redFlagCategory: null, missingInformation: ["onset"] }).success).toBe(true);
    expect(patientSummarySchema.safeParse({ summary: "Patient reports a headache beginning yesterday.", fields: { symptomOnset: "yesterday", symptomDuration: null, symptomLocation: null, severity: null, symptomPattern: null, associatedSymptoms: null, aggravatingFactors: null, relievingFactors: null, treatmentsTried: null, knownAllergies: null, existingConditions: null, currentMedication: null }, unansweredQuestions: [] }).success).toBe(true);
    expect(clinicianAssistantSchema.safeParse({ content: "Possible consideration for review", sourceInformationUsed: ["patient reason"], limitations: ["No examination findings"], icd10SearchTerms: [] }).success).toBe(true);
    expect(patientAssistantSchema.safeParse({ nextQuestion: "x", enoughInformation: "yes", redFlagCategory: null, missingInformation: [] }).success).toBe(false);
  });
  it("does not expose configured credentials in validated output", async () => {
    process.env.AI_API_KEY = "private-test-key"; process.env.AI_MODEL = "test-model";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ nextQuestion: null, enoughInformation: true, redFlagCategory: null, missingInformation: [] }) } }] }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const result = await requestStructuredAi({ system: "safe", payload: { text: "synthetic" }, schema: patientAssistantSchema });
    expect(result.data.enoughInformation).toBe(true);
    expect(JSON.stringify(result)).not.toContain("private-test-key");
  });
});
