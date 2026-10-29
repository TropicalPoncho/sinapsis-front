# uso: barrido2.sh <etiqueta> <variante|-> [dirCapturas]: rutas ampliadas; variante '-' = sin perillas
et=$1; v=$2; rutas=""
for r in "/" "/entidad/tropical-poncho" "/entidad/rama-cerratto" "/entidad/rama-cerratto?prof=2" "/entidad/tropical-poncho?prof=2" "/entidad/club-weyba?prof=2" "/entidad/keuken-aonikenk" "/entidad/obras?red=obras" "/obra/soma" "/entidad/tempistica-i" "/entidad/audiovisuales" "/entidad/laboratorios"; do
 if [[ "$v" == "-" ]]; then rutas="$rutas $r"; elif [[ "$r" == *"?"* ]]; then rutas="$rutas $r&$v"; else rutas="$rutas $r?$v"; fi; done
timeout 590 node medir.mjs $et ${3:--} $rutas > /dev/null 2>&1; node tabla.cjs $et
