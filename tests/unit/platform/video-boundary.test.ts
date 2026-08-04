import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function listFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out;
}

describe("video LiveKit boundary", () => {
  it("does not import livekit-server-sdk from patient or doctor UI trees", () => {
    const roots = [
      path.join(process.cwd(), "src/components/patient"),
      path.join(process.cwd(), "src/components/doctor"),
      path.join(process.cwd(), "src/app"),
    ];
    const forbidden = /from\s+["']livekit-server-sdk["']|require\(["']livekit-server-sdk["']\)/;
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of listFilesRecursive(root)) {
        if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue;
        // Shared platform kit and adapters are allowed under src/adapters and src/components/platform
        if (file.includes(`${path.sep}platform${path.sep}`)) continue;
        if (file.includes(`${path.sep}adapters${path.sep}`)) continue;
        const text = fs.readFileSync(file, "utf8");
        if (forbidden.test(text)) offenders.push(path.relative(process.cwd(), file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
