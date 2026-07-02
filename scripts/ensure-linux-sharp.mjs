// Ensure sharp's Linux x64 binaries are present in node_modules before
// `next build`, so a deploy built on a non-Linux machine (e.g. `netlify
// deploy --build` from a Mac) still bundles binaries the Netlify Functions
// runtime (Amazon Linux x64, glibc) can load. npm only installs the binaries
// for the machine it runs on, so without this a Mac-built deploy ships a
// sharp that crashes every image-rendering route in production.
//
// The packages are fetched additively (npm pack + tar extract) instead of
// `npm install --os=linux`, which would rewrite the tree and could prune the
// host platform's binaries that the local build itself still needs.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

if (process.platform === "linux") {
  console.log("ensure-linux-sharp: already on Linux — nothing to do.");
  process.exit(0);
}

const require = createRequire(import.meta.url);
const sharpPkgPath = require.resolve("sharp/package.json");
const sharpPkg = JSON.parse(fs.readFileSync(sharpPkgPath, "utf8"));
const imgDir = path.join(path.dirname(sharpPkgPath), "..", "@img");

const wanted = [
  ["@img/sharp-linux-x64", sharpPkg.optionalDependencies?.["@img/sharp-linux-x64"] ?? sharpPkg.version],
  ["@img/sharp-libvips-linux-x64", sharpPkg.optionalDependencies?.["@img/sharp-libvips-linux-x64"]],
];

let failed = false;
for (const [name, version] of wanted) {
  if (!version) {
    console.error(`ensure-linux-sharp: could not determine version for ${name}`);
    failed = true;
    continue;
  }
  const dest = path.join(imgDir, name.split("/")[1]);
  if (fs.existsSync(path.join(dest, "package.json"))) {
    console.log(`ensure-linux-sharp: ${name} already present.`);
    continue;
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pix-sharp-"));
  try {
    console.log(`ensure-linux-sharp: fetching ${name}@${version}…`);
    const out = execFileSync(
      "npm",
      ["pack", `${name}@${version}`, "--pack-destination", tmp, "--silent"],
      { encoding: "utf8" },
    ).trim();
    const tgz = path.join(tmp, out.split("\n").pop());
    fs.mkdirSync(dest, { recursive: true });
    execFileSync("tar", ["-xzf", tgz, "-C", dest, "--strip-components=1"]);
    if (!fs.existsSync(path.join(dest, "package.json"))) throw new Error("extract produced no package.json");
    console.log(`ensure-linux-sharp: installed ${name} → ${dest}`);
  } catch (err) {
    console.error(`ensure-linux-sharp: FAILED for ${name}: ${err.message}`);
    failed = true;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (failed) {
  console.error(
    "ensure-linux-sharp: refusing to continue — deploying without Linux sharp binaries would crash image rendering in production.",
  );
  process.exit(1);
}
