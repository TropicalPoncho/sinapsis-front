# uso: barrido.sh <etiqueta> <variante>...
et=$1; shift; rutas=""
for v in "$@"; do for r in "/" "/entidad/rama-cerratto" "/entidad/rama-cerratto?prof=2" "/entidad/tropical-poncho?prof=2" "/entidad/club-weyba?prof=2"; do
 if [[ "$r" == *"?"* ]]; then rutas="$rutas $r&$v"; else rutas="$rutas $r?$v"; fi; done; done
timeout 550 node medir.mjs $et - $rutas > /dev/null 2>&1; node tabla.cjs $et
