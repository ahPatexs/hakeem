const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function copyTree(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of fs.readdirSync(srcDir)) {
    if (name.endsWith(".node")) continue;
    const from = path.join(srcDir, name);
    const to = path.join(destDir, name);
    if (fs.statSync(from).isDirectory()) {
      copyTree(from, to);
      continue;
    }
    try {
      fs.copyFileSync(from, to);
    } catch (err) {
      console.warn("skip", to, err.code);
    }
  }
}

const schemaPath = path.join("prisma", "schema.prisma");
const tmpSchema = path.join("prisma", "schema.gen.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");
schema = schema.replace(
  'provider = "prisma-client-js"',
  'provider = "prisma-client-js"\n  output   = "../node_modules/.prisma/client-gen"',
);
fs.writeFileSync(tmpSchema, schema, "utf8");

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function isPostgresUrl(value) {
  return typeof value === "string" && /^postgres(ql)?:\/\//i.test(value);
}

loadEnvFile(".env");
loadEnvFile(".env.local");
if (!isPostgresUrl(process.env.DIRECT_URL) && isPostgresUrl(process.env.DATABASE_URL)) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const direct = spawnSync("npx", ["prisma", "generate"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

if (direct.status === 0) {
  fs.rmSync(tmpSchema, { force: true });
  process.exit(0);
}

const alt = spawnSync("npx", ["prisma", "generate", "--schema", tmpSchema], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});
if (alt.status !== 0) {
  fs.rmSync(tmpSchema, { force: true });
  process.exit(alt.status || 1);
}

copyTree(
  path.join("node_modules", ".prisma", "client-gen"),
  path.join("node_modules", ".prisma", "client"),
);
fs.rmSync(tmpSchema, { force: true });
const types = fs.readFileSync(path.join("node_modules", ".prisma", "client", "index.d.ts"), "utf8");
if (!types.includes("DoctorRating") || !types.includes("ratingAvg")) {
  console.error("Prisma client is missing DoctorRating / ratingAvg after generate");
  process.exit(1);
}
console.log("Prisma client generated with doctor ratings");
