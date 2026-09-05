import { FitCheckApp } from "@/components/FitCheckApp";
import { getAiStatus } from "@/config/env";

export default function FitCheckPage() {
  const ai = getAiStatus();
  const aiConfigured = ai.provider === "gemini" ? ai.geminiConfigured : ai.groqConfigured;
  return <FitCheckApp aiProvider={ai.provider} aiConfigured={aiConfigured} />;
}
