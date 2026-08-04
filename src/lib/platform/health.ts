import { access } from "node:fs/promises";
import path from "node:path";
import {
  getEmailAdapter,
  getMalwareAdapter,
  getPaymentsAdapter,
  getPushAdapter,
  getSmsAdapter,
  getStorageAdapter,
  getTelemedicineAdapter,
} from "@/adapters";
import { stubAiAssistantAdapter } from "@/adapters/stub-ai";

export type AdapterHealth = {
  key: string;
  ok: boolean;
  message: string;
  latencyMs: number;
};

async function timedPing(key: string, fn: () => Promise<boolean>, label: string): Promise<AdapterHealth> {
  const start = Date.now();
  try {
    const ok = await fn();
    return {
      key,
      ok,
      message: ok ? `${label} healthy` : `${label} unavailable`,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      key,
      ok: false,
      message: `${label} error: ${error instanceof Error ? error.message : "unknown"}`,
      latencyMs: Date.now() - start,
    };
  }
}

async function pingStorage(): Promise<boolean> {
  const root = path.join(process.cwd(), ".data", "uploads");
  await access(root).catch(async () => {
    await getStorageAdapter().upload({
      key: ".health/ping.txt",
      body: Buffer.from("ok"),
      contentType: "text/plain",
    });
  });
  return getStorageAdapter().exists(".health/ping.txt");
}

export async function pingEmailAdapter(): Promise<AdapterHealth> {
  const adapter = getEmailAdapter();
  return timedPing(
    "EMAIL",
    async () => (adapter.ping ? adapter.ping() : true),
    "Email",
  );
}

export async function pingSmsAdapter(): Promise<AdapterHealth> {
  const adapter = getSmsAdapter();
  return timedPing("SMS", async () => (adapter.ping ? adapter.ping() : false), "SMS");
}

export async function pingPushAdapter(): Promise<AdapterHealth> {
  const adapter = getPushAdapter();
  return timedPing("PUSH", async () => (adapter.ping ? adapter.ping() : false), "Push");
}

export async function pingStorageAdapter(): Promise<AdapterHealth> {
  return timedPing("STORAGE", pingStorage, "Storage");
}

export async function pingPaymentsAdapter(): Promise<AdapterHealth> {
  getPaymentsAdapter();
  return timedPing("PAYMENTS", async () => true, "Payments");
}

export async function pingAiAdapter(): Promise<AdapterHealth> {
  return timedPing("AI", async () => Boolean(stubAiAssistantAdapter), "AI");
}

export async function pingTelemedicineAdapter(): Promise<AdapterHealth> {
  const adapter = getTelemedicineAdapter();
  return timedPing(
    "TELEMEDICINE",
    async () => (adapter.ping ? adapter.ping() : true),
    "Telemedicine",
  );
}

export async function pingMalwareAdapter(): Promise<AdapterHealth> {
  getMalwareAdapter();
  return timedPing("MALWARE", async () => true, "Malware scan");
}

export async function pingAllPlatformAdapters(): Promise<AdapterHealth[]> {
  return Promise.all([
    pingEmailAdapter(),
    pingSmsAdapter(),
    pingPushAdapter(),
    pingStorageAdapter(),
    pingPaymentsAdapter(),
    pingAiAdapter(),
    pingTelemedicineAdapter(),
    pingMalwareAdapter(),
  ]);
}
