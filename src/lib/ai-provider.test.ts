import { afterEach, describe, expect, it, vi } from "vitest";
import { aiCapabilities, clinicianAssistantSchema, normalizeAiRedFlagCategory, patientAssistantSchema, patientSummarySchema, requestStructuredAi } from "./ai-provider";

afterEach(() => { delete process.env.AI_API_KEY; delete process.env.AI_MODEL; delete process.env.AI_PROVIDER; delete process.env.AI_API_URL; delete process.env.AI_TIMEOUT_MS; vi.unstubAllGlobals(); });

describe("structured AI adapter", () => {
  it("reports no capabilities and fails safely without server configuration", async () => {
    expect(aiCapabilities()).toEqual({ configured: false, imageInput: false, capabilities: [] });
    await expect(requestStructuredAi({ system: "safe", payload: {}, schema: patientAssistantSchema })).rejects.toThrow("AI_NOT_CONFIGURED");
  });
  it("uses the direct OpenAI endpoint and model when only an API key is configured", async () => {
    process.env.AI_API_KEY = "private-test-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ nextQuestion: null, enoughInformation: true, redFlagCategory: null, missingInformation: [] }) } }] }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await requestStructuredAi({ system: "safe", payload: {}, schema: patientAssistantSchema });
    expect(result.provider).toBe("OPENAI");
    expect(result.model).toBe("gpt-4o-mini");
    expect(fetchMock).toHaveBeenCalledWith("https://api.openai.com/v1/chat/completions", expect.any(Object));
  });
  it("validates structured patient and clinician output", () => {
    expect(patientAssistantSchema.safeParse({ nextQuestion: "When did it start?", enoughInformation: false, redFlagCategory: null, missingInformation: ["onset"] }).success).toBe(true);
    expect(patientSummarySchema.safeParse({ summary: "Patient reports a headache beginning yesterday.", fields: { symptomOnset: "yesterday", symptomDuration: null, symptomLocation: null, severity: null, symptomPattern: null, associatedSymptoms: null, aggravatingFactors: null, relievingFactors: null, treatmentsTried: null, knownAllergies: null, existingConditions: null, currentMedication: null }, unansweredQuestions: [] }).success).toBe(true);
    expect(clinicianAssistantSchema.safeParse({ content: "Possible consideration for review", sourceInformationUsed: ["patient reason"], limitations: ["No examination findings"], icd10SearchTerms: [] }).success).toBe(true);
    expect(patientAssistantSchema.safeParse({ nextQuestion: "x", enoughInformation: "yes", redFlagCategory: null, missingInformation: [] }).success).toBe(false);
    expect(normalizeAiRedFlagCategory("none")).toBeNull();
    expect(normalizeAiRedFlagCategory("No red flags")).toBeNull();
    expect(normalizeAiRedFlagCategory("sudden severe headache")).toBe("sudden severe headache");
  });
  it("does not expose configured credentials in validated output", async () => {
    process.env.AI_API_KEY = "private-test-key"; process.env.AI_MODEL = "test-model";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ nextQuestion: null, enoughInformation: true, redFlagCategory: null, missingInformation: [] }) } }] }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const result = await requestStructuredAi({ system: "safe", payload: { text: "synthetic" }, schema: patientAssistantSchema });
    expect(result.data.enoughInformation).toBe(true);
    expect(JSON.stringify(result)).not.toContain("private-test-key");
  });
  it.each([
    ["Markdown-fenced", "```json\n{\"nextQuestion\":null,\"enoughInformation\":true,\"redFlagCategory\":null,\"missingInformation\":[]}\n```"],
    ["single-item array", "[{\"nextQuestion\":null,\"enoughInformation\":true,\"redFlagCategory\":null,\"missingInformation\":[]}]"],
  ])("accepts %s JSON while retaining schema validation", async (_label, content) => {
    process.env.AI_API_KEY = "private-test-key"; process.env.AI_MODEL = "test-model";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const result = await requestStructuredAi({ system: "safe", payload: {}, schema: patientAssistantSchema });
    expect(result.data.enoughInformation).toBe(true);
  });
  it("requests strict structured output and OpenRouter parameter support", async () => {
    process.env.AI_API_KEY = "private-test-key"; process.env.AI_MODEL = "openrouter/free"; process.env.AI_API_URL = "https://openrouter.ai/api/v1/chat/completions";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ nextQuestion: null, enoughInformation: true, redFlagCategory: null, missingInformation: [] }) } }] }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await requestStructuredAi({ system: "safe", payload: {}, schema: patientAssistantSchema });
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(request.response_format.type).toBe("json_schema");
    expect(request.response_format.json_schema.strict).toBe(true);
    expect(request.plugins).toEqual([{ id: "response-healing" }]);
    expect(request.provider).toEqual({ require_parameters: true });
  });
  it("retries invalid OpenRouter output in JSON compatibility mode", async () => {
    process.env.AI_API_KEY = "private-test-key"; process.env.AI_MODEL = "openrouter/free"; process.env.AI_API_URL = "https://openrouter.ai/api/v1/chat/completions";
    const valid = JSON.stringify({ nextQuestion: null, enoughInformation: true, redFlagCategory: null, missingInformation: [] });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "not json" } }] }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: valid } }] }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await requestStructuredAi({ system: "safe", payload: {}, schema: patientAssistantSchema });
    expect(result.data.enoughInformation).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryRequest = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(retryRequest.response_format).toEqual({ type: "json_object" });
  });
});
