import { DiscoveryApp } from "@/components/DiscoveryApp";
import { getAiStatus, getSearchStatus } from "@/config/env";

export default function Home() {
  const search = getSearchStatus();
  const ai = getAiStatus();

  return <DiscoveryApp searchProvider={search.provider} aiProvider={ai.provider} />;
}
