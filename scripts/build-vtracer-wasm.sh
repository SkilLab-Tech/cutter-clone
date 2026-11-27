#!/usr/bin/env bash
# T-013: reproducible browser build of vtracer (MIT OR Apache-2.0) as WebAssembly.
# Builds the upstream wasm-bindgen crate `nodejs/` (vtracer-wasm) at a pinned commit and runs
# wasm-bindgen with --target web, so the glue loads in a browser or worker. (The npm package
# @visioncortex/vtracer ships --target nodejs glue that needs `fs`.)
# Requires Docker. Output: apps/web/src/vendor/vtracer/ and third-party/licenses/vtracer.txt
# Usage: scripts/build-vtracer-wasm.sh
set -euo pipefail

VTRACER_REPO=https://github.com/visioncortex/vtracer.git
VTRACER_COMMIT=82fedd1a9effeaf835d47518db8da60c4f3edaa7 # master, 2026-11-23
RUST_IMAGE=${RUST_IMAGE:-rust:1-bookworm}

ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT=$ROOT/apps/web/src/vendor/vtracer
LICENSES=$ROOT/third-party/licenses
mkdir -p "$OUT" "$LICENSES"

docker run --rm \
  -e VTRACER_REPO="$VTRACER_REPO" -e VTRACER_COMMIT="$VTRACER_COMMIT" \
  -e HOST_UID="$(id -u)" -e HOST_GID="$(id -g)" \
  -v "$OUT:/out" -v "$LICENSES:/licenses" \
  "$RUST_IMAGE" bash -euo pipefail -c '
    apt-get update -qq >/dev/null && apt-get install -y -qq jq >/dev/null
    git clone -q "$VTRACER_REPO" /src && cd /src && git checkout -q "$VTRACER_COMMIT"
    rustup target add wasm32-unknown-unknown >/dev/null 2>&1
    cd nodejs
    cargo build --release --target wasm32-unknown-unknown 2>&1 | tail -2
    META=$(cargo metadata --format-version 1 --filter-platform wasm32-unknown-unknown)
    BINDGEN=$(echo "$META" | jq -r ".packages[] | select(.name==\"wasm-bindgen\") | .version" | head -1)
    cargo install -q wasm-bindgen-cli --version "$BINDGEN"
    WASM="$(echo "$META" | jq -r .target_directory)/wasm32-unknown-unknown/release/vtracer_wasm.wasm"
    wasm-bindgen --target web --out-dir /out --out-name vtracer_wasm "$WASM"

    # Crates linked into the wasm: walk normal (non-dev, non-build) deps from the root.
    ROOT_ID=$(echo "$META" | jq -r .resolve.root)
    echo "$META" | jq -r --arg root "$ROOT_ID" "
      (.resolve.nodes | map({key: .id, value: [.deps[] | select(any(.dep_kinds[]; .kind == null)) | .pkg]}) | from_entries) as \$g
      | (.packages | map({key: .id, value: .}) | from_entries) as \$p
      | [\$root] | until(. as \$s | ([\$s[] | \$g[.][]?] + \$s | unique) == \$s; . as \$s | [\$s[] | \$g[.][]?] + \$s | unique)
      | map(\$p[.] | [.name, .version, (.license // \"(none)\")] | @tsv) | sort[]" > /out/CRATES.tsv

    cp /src/LICENSE /licenses/vtracer.txt
    {
      echo "source $VTRACER_REPO"
      echo "commit $VTRACER_COMMIT"
      echo "crate nodejs/ (vtracer-wasm)"
      rustc --version
      echo "wasm-bindgen $BINDGEN --target web"
    } > /out/BUILD-INFO.txt
    chown -R "$HOST_UID:$HOST_GID" /out /licenses
  '
ls -la "$OUT"
