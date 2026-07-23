# Signed ZXP Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce and verify a free, self-signed `ArtboardSizeRenamer-v1.0.0-signed.zxp` without storing the certificate or password in Git.

**Architecture:** A repository-owned allowlist and Bash release script stage only approved CEP files, retrieve the certificate password from macOS Keychain, and publish the ZXP only after Adobe `ZXPSignCmd` verifies its signature. Adobe's signer, the `.p12`, and its password remain outside the repository; release artifacts are ignored and accompanied by SHA-256 checksums.

**Tech Stack:** Bash 3.2+, Node.js test runner, macOS Keychain (`security`), Adobe `ZXPSignCmd` 4.1.2, `openssl`, `curl`, `hdiutil`, `shasum`.

## Global Constraints

- Certificate identity is exactly `C=TH`, `ST=Bangkok`, `O=Moo_Ai`, `CN=Artboard Size Renamer`.
- Store the `.p12` at `/Users/aibd/Library/Application Support/Moo_Ai/Signing/ArtboardSizeRenamer.p12` and the signer at `/Users/aibd/Library/Application Support/Moo_Ai/ZXPSignCmd/ZXPSignCmd`.
- Store the randomly generated password only in macOS Keychain service `Moo_Ai Artboard Size Renamer Signing`, account `aibd`.
- Never print or commit the certificate password, `.p12`, or signing binary.
- Package only `CSXS/`, `assets/`, `catalog/`, `client/`, `host/`, and `README.md`.
- Never include `.git`, `.DS_Store`, `node_modules`, `test`, `docs`, `releases`, certificates, passwords, or signing tools.
- A timestamp and successful `ZXPSignCmd -verify` are mandatory; do not publish an output when either signing or verification fails.
- Final outputs are `releases/ArtboardSizeRenamer-v1.0.0-signed.zxp` and `releases/ArtboardSizeRenamer-v1.0.0-signed.zxp.sha256`.
- Do not purchase a commercial certificate, submit to Adobe Marketplace, or create a GitHub Actions workflow.

---

### Task 1: Add a deterministic, secret-safe release workflow

**Files:**
- Create: `release-files.txt`
- Create: `scripts/build-signed-zxp.sh`
- Create: `test/release.test.cjs`
- Modify: `.gitignore`
- Modify: `README.md`

**Interfaces:**
- Produces: `release-files.txt`, the single source of package inputs consumed by `scripts/build-signed-zxp.sh`.
- Produces: `scripts/build-signed-zxp.sh`, which reads the fixed Keychain service and external signer/certificate paths and creates the two release artifacts.
- Consumes: no certificate or password during unit tests; actual secret access occurs only when the release script runs in Task 3.

- [ ] **Step 1: Write the failing release-policy tests**

Create `test/release.test.cjs`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const EXPECTED_RELEASE_PATHS = [
  'CSXS',
  'assets',
  'catalog',
  'client',
  'host',
  'README.md'
];

test('signed release allowlist contains only runtime files', () => {
  const entries = fs.readFileSync('release-files.txt', 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  assert.deepEqual(entries, EXPECTED_RELEASE_PATHS);
  entries.forEach((entry) => assert.equal(fs.existsSync(entry), true));
  ['.git', '.DS_Store', 'node_modules', 'test', 'docs', 'releases'].forEach((forbidden) => {
    assert.equal(entries.includes(forbidden), false);
  });
});

test('signed release script keeps secrets external and verifies before publishing', () => {
  const script = fs.readFileSync('scripts/build-signed-zxp.sh', 'utf8');
  const verifyAt = script.indexOf('-verify');
  const publishAt = script.indexOf('mv -- "$temporary_zxp" "$output_zxp"');

  assert.match(script, /security find-generic-password/);
  assert.match(script, /Moo_Ai Artboard Size Renamer Signing/);
  assert.match(script, /\/Users\/aibd\/Library\/Application Support\/Moo_Ai\/Signing\/ArtboardSizeRenamer\.p12/);
  assert.doesNotMatch(script, /BEGIN (RSA )?PRIVATE KEY/);
  assert.ok(verifyAt >= 0);
  assert.ok(publishAt > verifyAt);
});

test('release artifacts are ignored and signed installation is documented', () => {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  const readme = fs.readFileSync('README.md', 'utf8');

  assert.match(gitignore, /^\/releases\/$/m);
  assert.match(readme, /Signed ZXP installation/);
  assert.match(readme, /การติดตั้ง Signed ZXP/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/release.test.cjs`

Expected: FAIL because `release-files.txt` and `scripts/build-signed-zxp.sh` do not exist and the release documentation is absent.

- [ ] **Step 3: Add the allowlist, ignore rule, script, and bilingual instructions**

Create `release-files.txt`:

```text
CSXS
assets
catalog
client
host
README.md
```

Append this exact line to `.gitignore`:

```gitignore
/releases/
```

Create `scripts/build-signed-zxp.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

umask 077

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
tool_path="/Users/aibd/Library/Application Support/Moo_Ai/ZXPSignCmd/ZXPSignCmd"
certificate_path="/Users/aibd/Library/Application Support/Moo_Ai/Signing/ArtboardSizeRenamer.p12"
keychain_service="Moo_Ai Artboard Size Renamer Signing"
keychain_account="aibd"
timestamp_url="http://timestamp.digicert.com/"
output_zxp="$project_root/releases/ArtboardSizeRenamer-v1.0.0-signed.zxp"
checksum_path="$output_zxp.sha256"
work_root=""
signing_password=""

cleanup() {
  unset signing_password
  case "$work_root" in
    /private/tmp/artboard-size-renamer-zxp.*)
      rm -rf -- "$work_root"
      ;;
  esac
}
trap cleanup EXIT INT TERM

run_zxp_signer() {
  if [ "$(uname -m)" = "arm64" ]; then
    arch -x86_64 "$tool_path" "$@"
  else
    "$tool_path" "$@"
  fi
}

for required_file in "$tool_path" "$certificate_path" "$project_root/release-files.txt"; do
  if [ ! -e "$required_file" ]; then
    printf 'Missing required signing input: %s\n' "$required_file" >&2
    exit 1
  fi
done

if [ -e "$output_zxp" ] || [ -e "$checksum_path" ]; then
  printf 'Release output already exists; move it before rebuilding: %s\n' "$output_zxp" >&2
  exit 1
fi

signing_password="$(security find-generic-password -a "$keychain_account" -s "$keychain_service" -w)"
work_root="$(mktemp -d /private/tmp/artboard-size-renamer-zxp.XXXXXX)"
staging_root="$work_root/package"
temporary_zxp="$work_root/ArtboardSizeRenamer-v1.0.0-signed.zxp"
mkdir -p "$staging_root"

while IFS= read -r release_path; do
  [ -n "$release_path" ] || continue
  if [ ! -e "$project_root/$release_path" ]; then
    printf 'Allowlisted release input is missing: %s\n' "$release_path" >&2
    exit 1
  fi
  destination_parent="$staging_root/$(dirname "$release_path")"
  mkdir -p "$destination_parent"
  cp -R "$project_root/$release_path" "$destination_parent/"
done < "$project_root/release-files.txt"

run_zxp_signer -sign "$staging_root" "$temporary_zxp" "$certificate_path" "$signing_password" -tsa "$timestamp_url"
unset signing_password
run_zxp_signer -verify "$temporary_zxp" -certinfo

mkdir -p "$project_root/releases"
mv -- "$temporary_zxp" "$output_zxp"
shasum -a 256 "$output_zxp" > "$checksum_path"
shasum -a 256 -c "$checksum_path"
printf 'Signed ZXP created: %s\n' "$output_zxp"
```

Make it executable: `chmod 700 scripts/build-signed-zxp.sh`.

Append this section to `README.md`:

```markdown
## Signed ZXP installation / การติดตั้ง Signed ZXP

The signed release is `ArtboardSizeRenamer-v1.0.0-signed.zxp`. Install it with a ZXP-capable Adobe extension installer, fully quit Illustrator, then reopen Illustrator and choose **Window → Extensions → Artboard Size Renamer**. Verify the downloaded file against the accompanying `.sha256` file before installation.

ไฟล์สำหรับแจกคือ `ArtboardSizeRenamer-v1.0.0-signed.zxp` ให้ติดตั้งด้วยเครื่องมือติดตั้ง Adobe extension ที่รองรับ ZXP จากนั้นปิด Illustrator ให้หมด เปิดใหม่ แล้วไปที่ **Window → Extensions → Artboard Size Renamer** ควรตรวจสอบไฟล์ด้วย `.sha256` ที่ให้มาด้วยก่อนติดตั้ง

This direct-distribution build uses a self-signed certificate from `Moo_Ai`; it is not an Adobe Marketplace listing. / รุ่นแจกโดยตรงนี้ใช้ self-signed certificate ของ `Moo_Ai` และยังไม่ใช่รายการบน Adobe Marketplace
```

- [ ] **Step 4: Run focused and full tests**

Run: `node --test test/release.test.cjs`

Expected: 3 tests pass, 0 fail.

Run: `npm test`

Expected: all project tests pass.

- [ ] **Step 5: Commit the release workflow**

```bash
git add .gitignore README.md release-files.txt scripts/build-signed-zxp.sh test/release.test.cjs
git commit -m "feat: add secure signed ZXP release workflow"
```

### Task 2: Provision Adobe signer, Keychain secret, and self-signed certificate

**Files:**
- Create outside Git: `/Users/aibd/Library/Application Support/Moo_Ai/ZXPSignCmd/ZXPSignCmd`
- Create outside Git: `/Users/aibd/Library/Application Support/Moo_Ai/Signing/ArtboardSizeRenamer.p12`
- Create outside Git: macOS Keychain item `Moo_Ai Artboard Size Renamer Signing` for account `aibd`

**Interfaces:**
- Produces: the exact tool, certificate, and Keychain inputs consumed by `scripts/build-signed-zxp.sh`.
- Consumes: Adobe's official `ZXPSignCmd-64bit.dmg` and a locally generated random password that is never printed.

- [ ] **Step 1: Check architecture and Rosetta compatibility**

Run:

```bash
uname -m
if [ "$(uname -m)" = "arm64" ]; then arch -x86_64 /usr/bin/true; fi
```

Expected: `x86_64`, or `arm64` with the Rosetta command exiting 0. If the Rosetta command fails, stop and request approval before running `softwareupdate --install-rosetta --agree-to-license`.

- [ ] **Step 2: Download and install Adobe ZXPSignCmd 4.1.2 outside the repository**

Run:

```bash
signer_dmg="/private/tmp/ZXPSignCmd-64bit-4.1.2.dmg"
signer_mount="/private/tmp/MooAi-ZXPSignCmd-mount"
signer_dir="/Users/aibd/Library/Application Support/Moo_Ai/ZXPSignCmd"
curl -L --fail --silent --show-error \
  "https://raw.githubusercontent.com/Adobe-CEP/CEP-Resources/master/ZXPSignCMD/4.1.2/macOS/ZXPSignCmd-64bit.dmg" \
  -o "$signer_dmg"
mkdir -p "$signer_mount" "$signer_dir"
hdiutil attach -nobrowse -readonly -mountpoint "$signer_mount" "$signer_dmg"
signer_source="$(find "$signer_mount" -type f \( -name 'ZXPSignCmd' -o -name 'ZXPSignCmd-64bit' \) -print -quit)"
test -n "$signer_source"
cp "$signer_source" "$signer_dir/ZXPSignCmd"
chmod 700 "$signer_dir/ZXPSignCmd"
hdiutil detach "$signer_mount"
file "$signer_dir/ZXPSignCmd"
```

Expected: the installed file is a 64-bit Mach-O executable. Run it directly on Intel or through `arch -x86_64` on Apple Silicon and confirm it prints its usage text.

- [ ] **Step 3: Create the random Keychain password without logging it**

Run this in one shell with command tracing disabled:

```bash
set +x
keychain_service="Moo_Ai Artboard Size Renamer Signing"
keychain_account="aibd"
if ! security find-generic-password -a "$keychain_account" -s "$keychain_service" >/dev/null 2>&1; then
  signing_password="$(openssl rand -base64 36)"
  security add-generic-password -a "$keychain_account" -s "$keychain_service" -l "$keychain_service" -U -w "$signing_password"
  unset signing_password
fi
security find-generic-password -a "$keychain_account" -s "$keychain_service" >/dev/null
```

Expected: the final lookup exits 0 and no password is printed.

- [ ] **Step 4: Create the self-signed certificate**

Run in one shell with tracing disabled:

```bash
set +x
tool_path="/Users/aibd/Library/Application Support/Moo_Ai/ZXPSignCmd/ZXPSignCmd"
certificate_dir="/Users/aibd/Library/Application Support/Moo_Ai/Signing"
certificate_path="$certificate_dir/ArtboardSizeRenamer.p12"
signing_password="$(security find-generic-password -a "aibd" -s "Moo_Ai Artboard Size Renamer Signing" -w)"
mkdir -p "$certificate_dir"
if [ ! -e "$certificate_path" ]; then
  if [ "$(uname -m)" = "arm64" ]; then
    arch -x86_64 "$tool_path" -selfSignedCert "TH" "Bangkok" "Moo_Ai" "Artboard Size Renamer" "$signing_password" "$certificate_path"
  else
    "$tool_path" -selfSignedCert "TH" "Bangkok" "Moo_Ai" "Artboard Size Renamer" "$signing_password" "$certificate_path"
  fi
fi
openssl pkcs12 -in "$certificate_path" -passin "pass:$signing_password" -clcerts -nokeys | openssl x509 -noout -subject -dates
unset signing_password
chmod 600 "$certificate_path"
```

Expected: subject contains `C=TH`, `ST=Bangkok`, `O=Moo_Ai`, and `CN=Artboard Size Renamer`; certificate dates are printed, and the `.p12` mode is `600`.

- [ ] **Step 5: Confirm no signing material entered Git**

Run:

```bash
git status --short
git ls-files '*.p12' 'ZXPSignCmd*'
```

Expected: no `.p12` or signer binary is tracked; only Task 1's intentional committed files exist in Git.

### Task 3: Build, verify, and hand off the signed release

**Files:**
- Create ignored artifact: `releases/ArtboardSizeRenamer-v1.0.0-signed.zxp`
- Create ignored artifact: `releases/ArtboardSizeRenamer-v1.0.0-signed.zxp.sha256`

**Interfaces:**
- Consumes: the Task 1 allowlist/script and Task 2 external signer, certificate, and Keychain password.
- Produces: verified release files suitable for direct distribution.

- [ ] **Step 1: Run the complete source test suite**

Run: `npm test`

Expected: all tests pass before signing.

- [ ] **Step 2: Build the ZXP through the secure release script**

Run: `scripts/build-signed-zxp.sh`

Expected: signer reports success, `-verify` reports a valid signature/certificate, SHA-256 verification prints `OK`, and the script publishes both expected files only after verification.

- [ ] **Step 3: Inspect signed package structure and forbidden paths**

Run:

```bash
signed_zxp="releases/ArtboardSizeRenamer-v1.0.0-signed.zxp"
unzip -t "$signed_zxp"
unzip -Z1 "$signed_zxp" | sort
if unzip -Z1 "$signed_zxp" | rg -q '(^|/)(\.DS_Store|\.git|node_modules|test|docs|releases)(/|$)|\.p12$|ZXPSignCmd'; then
  printf 'Forbidden release content detected\n' >&2
  exit 1
fi
```

Expected: `mimetype`, Adobe signature metadata under `META-INF/`, and only allowlisted runtime paths are present; the forbidden-content check exits 0.

- [ ] **Step 4: Re-verify signature and checksum independently**

Run:

```bash
signed_zxp="releases/ArtboardSizeRenamer-v1.0.0-signed.zxp"
tool_path="/Users/aibd/Library/Application Support/Moo_Ai/ZXPSignCmd/ZXPSignCmd"
if [ "$(uname -m)" = "arm64" ]; then
  arch -x86_64 "$tool_path" -verify "$signed_zxp" -certinfo
else
  "$tool_path" -verify "$signed_zxp" -certinfo
fi
shasum -a 256 -c "$signed_zxp.sha256"
```

Expected: signature verification succeeds and checksum prints `OK`.

- [ ] **Step 5: Run final readiness and secret scans**

Run:

```bash
npm test
python3 /Users/aibd/.codex/skills/gold-rules/scripts/project_readiness.py "/Users/aibd/Documents/DATA/Web_Projects/plugin Adobe"
git diff --check
git status --short
git ls-files '*.p12' 'ZXPSignCmd*'
```

Expected: tests pass, no critical readiness findings, diff check is clean, working tree has no unintended source changes, and no signing material is tracked.
