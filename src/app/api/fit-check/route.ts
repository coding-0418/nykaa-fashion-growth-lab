import { getAiProvider } from "@/lib/ai/provider";
import { InvalidRequestError } from "@/lib/errors";
import { toErrorResponse } from "@/lib/errors";
import { runFitCheck, validateFitCheckRequest } from "@/lib/fit-check/reasoning";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json") ? await request.json() : {};

    const validated = validateFitCheckRequest(payload);
    if (!validated.ok) {
      throw new InvalidRequestError(validated.error);
    }

    const ai = getAiProvider();
    const result = await runFitCheck(validated.value, { ai });

    return Response.json(result);
  } catch (error) {
    const { body, status } = toErrorResponse(error);
    return Response.json(body, { status });
  }
}
