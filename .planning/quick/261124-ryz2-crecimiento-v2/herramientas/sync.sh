#!/bin/bash
# copia src del repo a la copia aislada (node_modules y public enlazados por junction) y regenera la fixture desde los CSV.
# uso: sync.sh [tardia]   -> "tardia" agrega una raiz tardia de ejemplo SOLO en la fixture (no en datos reales)
R=/c/Users/ramac/source/TropicalPoncho/sinapsis/sinapsis_front
ISO="/c/Users/ramac/AppData/Local/Temp/claude/05628b302de61beb/cd1d2412-dfa0-4d87-b8ec-08feef9ed943/scratchpad/ryz-iso"
cp -r "$R/src/." "$ISO/src/"
cd "$R" && node --experimental-strip-types .planning/quick/261124-ryz2-crecimiento-v2/herramientas/build-fixture.mts "$ISO/src/lib/red/fixtures/topologia.json" "$ISO/src/lib/red/fixtures/detalles.json" $1 2>&1 | tail -2
