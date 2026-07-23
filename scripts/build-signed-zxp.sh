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

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

for required_file in "$tool_path" "$certificate_path"; do
  if [ ! -e "$required_file" ]; then
    printf 'Missing required signing input: %s\n' "$required_file" >&2
    exit 1
  fi
done

if [ -e "$output_zxp" ] || [ -e "$checksum_path" ]; then
  printf 'Release output already exists; move it before rebuilding: %s\n' "$output_zxp" >&2
  exit 1
fi

work_root="$(mktemp -d /private/tmp/artboard-size-renamer-zxp.XXXXXX)"
expected_allowlist="$work_root/release-files.expected"
release_allowlist="$project_root/release-files.txt"
staging_root="$work_root/package"
temporary_zxp="$work_root/ArtboardSizeRenamer-v1.0.0-signed.zxp"

printf '%s\n' \
  CSXS \
  assets \
  catalog \
  client \
  host \
  README.md > "$expected_allowlist"

if [ ! -f "$release_allowlist" ] || [ -L "$release_allowlist" ] || ! cmp -s "$release_allowlist" "$expected_allowlist"; then
  fail 'release-files.txt must contain exactly the approved ordered runtime paths'
fi

validate_release_input() {
  release_path="$1"
  release_input="$project_root/$release_path"

  if [ ! -e "$release_input" ] || [ -L "$release_input" ] || { [ ! -f "$release_input" ] && [ ! -d "$release_input" ]; }; then
    fail "Invalid release input: $release_path"
  fi

  if find "$release_input" -type l -print -quit | grep -q .; then
    fail "Symlinked release content is not allowed: $release_path"
  fi

  if find "$release_input" \( \
    -name .git -o \
    -name .DS_Store -o \
    -name node_modules -o \
    -name test -o \
    -name docs -o \
    -name releases -o \
    -iname '*.p12' -o \
    -iname '*.pfx' -o \
    -iname '*.pem' -o \
    -iname '*.key' -o \
    -iname '*.cer' -o \
    -iname '*.crt' -o \
    -iname '*password*' -o \
    -iname '*passwd*' -o \
    -iname 'zxpsigncmd' \
  \) -print -quit | grep -q .; then
    fail "Forbidden release content: $release_path"
  fi

  while IFS= read -r candidate; do
    if grep -I -q -E -- '-----BEGIN( [A-Z0-9]+)? PRIVATE KEY-----' "$candidate"; then
      fail "Forbidden private key material: $release_path"
    fi
  done < <(find "$release_input" -type f -print)
}

while IFS= read -r release_path; do
  validate_release_input "$release_path"
done < "$release_allowlist"

# ZXPSignCmd has no supported stdin/password-file interface. Run only in a
# trusted local user session: the password is transiently visible to same-user
# process inspection, but is never logged or written to disk.
signing_password="$(security find-generic-password -a "$keychain_account" -s "$keychain_service" -w)"
mkdir -p "$staging_root"

while IFS= read -r release_path; do
  destination_parent="$staging_root/$(dirname "$release_path")"
  mkdir -p "$destination_parent"
  cp -R "$project_root/$release_path" "$destination_parent/"
done < "$release_allowlist"

run_zxp_signer -sign "$staging_root" "$temporary_zxp" "$certificate_path" "$signing_password" -tsa "$timestamp_url"
unset signing_password
run_zxp_signer -verify "$temporary_zxp" -certinfo

mkdir -p "$project_root/releases"
mv -- "$temporary_zxp" "$output_zxp"
shasum -a 256 "$output_zxp" > "$checksum_path"
shasum -a 256 -c "$checksum_path"
printf 'Signed ZXP created: %s\n' "$output_zxp"
