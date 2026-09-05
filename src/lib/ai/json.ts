export function parseModelJson(
  text: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "Empty model response." };
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return { ok: false, error: "No JSON object found in model response." };
  }

  const slice = candidate.slice(start, end + 1);

  try {
    return { ok: true, value: JSON.parse(slice) };
  } catch {
    return { ok: false, error: "Malformed JSON in model response." };
  }
}
