import {
  AntigravityAdapter,
  ClaudeAdapter,
  CodexAdapter,
  OpenCodeAdapter
} from "./adapters.js";
import { AGENT_PROVIDERS, type AgentAdapter, type AgentProvider } from "./types.js";

const adapters: Record<AgentProvider, AgentAdapter> = {
  claude: new ClaudeAdapter(),
  codex: new CodexAdapter(),
  opencode: new OpenCodeAdapter(),
  antigravity: new AntigravityAdapter()
};

export function parseAgentProvider(value: string): AgentProvider {
  const normalized = value.trim().toLowerCase();
  if (!AGENT_PROVIDERS.includes(normalized as AgentProvider)) {
    throw new Error(
      `Invalid agent provider: ${value}. Expected one of: ${AGENT_PROVIDERS.join(", ")}`
    );
  }
  return normalized as AgentProvider;
}

export function getAgentAdapter(provider: AgentProvider): AgentAdapter {
  return adapters[provider];
}

export async function listAgentProviders(): Promise<
  Array<{ provider: AgentProvider; available: boolean }>
> {
  return Promise.all(
    AGENT_PROVIDERS.map(async (provider) => ({
      provider,
      available: await adapters[provider].isAvailable()
    }))
  );
}
