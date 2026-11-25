#!/bin/bash
# copia src del repo a la copia aislada (node_modules y public enlazados por junction) y regenera la fixture desde los CSV.
# uso: ISO=<dir> sync.sh [tardia]   -> "tardia" agrega una raiz tardia de ejemplo SOLO en la fixture (no en datos reales)
R="$(cd "$(dirname "$0")/../../../.." && pwd)"
: "${ISO:?definir ISO=<dir de la copia aislada>}"
cp -r "$R/src/." "$ISO/src/"
cd "$R" && node --experimental-strip-types .planning/quick/261124-ryz2-crecimiento-v2/herramientas/build-fixture.mts "$ISO/src/lib/red/fixtures/topologia.json" "$ISO/src/lib/red/fixtures/detalles.json" $1 2>&1 | tail -2
