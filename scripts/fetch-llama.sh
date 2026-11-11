#!/bin/bash
# Downloads the official llama.cpp server builds into vendor/llama/<platform>-<arch>/.
# Mac: Metal. Windows: Vulkan (falls back to CPU when there is no Vulkan GPU).
set -euo pipefail
TAG=b12277
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP=$(mktemp -d)
get() { # name outdir
  curl -sL --retry 5 -o "$TMP/$1" "https://github.com/ggml-org/llama.cpp/releases/download/$TAG/$1"
  rm -rf "$2"; mkdir -p "$2" "$TMP/x"; rm -rf "$TMP/x"/*
  case "$1" in *.zip) unzip -q "$TMP/$1" -d "$TMP/x";; *) tar -xzf "$TMP/$1" -C "$TMP/x";; esac
}
for arch in arm64 x64; do
  out="$ROOT/vendor/llama/darwin-$arch"
  get "llama-$TAG-bin-macos-$arch.tar.gz" "$out"
  src=$(dirname "$(find "$TMP/x" -name llama-server -type f | head -1)")
  cp "$src/llama-server" "$out/"; cp "$src"/*.dylib "$out/" 2>/dev/null || true
  [ -f "$src/LICENSE" ] && cp "$src/LICENSE" "$out/LICENSE-llama.cpp.txt" || true
done
out="$ROOT/vendor/llama/win32-x64"
get "llama-$TAG-bin-win-vulkan-x64.zip" "$out"
src=$(dirname "$(find "$TMP/x" -name llama-server.exe -type f | head -1)")
cp "$src/llama-server.exe" "$out/"; cp "$src"/*.dll "$out/"
# Keep only what llama-server needs: drop other tools' libraries and duplicate versioned names.
for d in "$ROOT"/vendor/llama/darwin-*; do
  (cd "$d" && rm -f libllama-*-impl.dylib.keep && for f in libllama-*-impl.dylib; do [ "$f" = libllama-server-impl.dylib ] || rm -f "$f"; done
   for f in *.dylib; do case "$f" in *-impl.dylib|*.0.dylib) ;; *) rm -f "$f";; esac; done
   rm -f *.*.*.dylib
   for f in *; do codesign --force --sign - "$f" 2>/dev/null || true; done)
done
(cd "$ROOT/vendor/llama/win32-x64" && for f in llama-*-impl.dll; do [ "$f" = llama-server-impl.dll ] || rm -f "$f"; done)
# Microsoft's Visual C++ runtime, which the Windows engine needs; the installer adds it if missing.
mkdir -p "$ROOT/vendor/redist"
[ -f "$ROOT/vendor/redist/vc_redist.x64.exe" ] || curl -sL --retry 5 -o "$ROOT/vendor/redist/vc_redist.x64.exe" https://aka.ms/vs/17/release/vc_redist.x64.exe
rm -rf "$TMP"
du -sh "$ROOT"/vendor/llama/*
