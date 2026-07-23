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
