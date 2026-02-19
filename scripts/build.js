const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT_DIR = path.resolve(__dirname, "..");
const STATIC_BUILD_DIR = path.resolve(ROOT_DIR, "static-build");

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT_DIR });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

function copyRecursive(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".js": "application/javascript",
    ".hbc": "application/javascript",
    ".json": "application/json",
  };
  return map[ext] || "application/octet-stream";
}

function buildPlatform(platform) {
  const distDir = path.join(ROOT_DIR, `dist-${platform}`);

  console.log(`\nBuilding ${platform}...`);
  run(`npx expo export --platform ${platform} --output-dir ${distDir}`);

  const metadataPath = path.join(distDir, "metadata.json");
  if (!fs.existsSync(metadataPath)) {
    console.error(`No metadata.json found for ${platform}`);
    return;
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
  const platformMeta = metadata.fileMetadata[platform];
  if (!platformMeta) {
    console.error(`No file metadata for ${platform}`);
    return;
  }

  const bundleRelPath = platformMeta.bundle;
  const bundleAbsPath = path.join(distDir, bundleRelPath);

  if (!fs.existsSync(bundleAbsPath)) {
    console.error(`Bundle not found: ${bundleAbsPath}`);
    return;
  }

  const bundleHash = hashFile(bundleAbsPath);

  const assets = (platformMeta.assets || []).map((asset) => {
    const assetPath = path.join(distDir, asset.path);
    return {
      hash: fs.existsSync(assetPath) ? hashFile(assetPath) : "",
      key: asset.path,
      contentType: getContentType(`.${asset.ext}`),
      url: `/${asset.path}`,
    };
  });

  const appJson = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, "app.json"), "utf-8"),
  );
  const expoConfig = appJson.expo || {};

  const manifest = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    runtimeVersion: "1.0.0",
    launchAsset: {
      hash: bundleHash,
      key: "bundle",
      contentType: "application/javascript",
      url: `/${bundleRelPath}`,
    },
    assets,
    metadata: {},
    extra: {
      expoClient: {
        ...expoConfig,
        hostUri: "",
      },
    },
  };

  const platformDir = path.join(STATIC_BUILD_DIR, platform);
  ensureDir(platformDir);
  fs.writeFileSync(
    path.join(platformDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log(`  Created ${platform}/manifest.json`);

  copyRecursive(distDir, STATIC_BUILD_DIR);
  console.log(`  Copied ${platform} bundle files to static-build/`);
}

async function main() {
  console.log("Building Expo static bundles...\n");

  ensureDir(STATIC_BUILD_DIR);

  for (const platform of ["android", "ios"]) {
    buildPlatform(platform);
  }

  console.log("\nBuild complete!");
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
