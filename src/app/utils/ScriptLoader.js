import { useEffect } from 'react';

const ScriptLoader = ({ arActive }) => {
  useEffect(() => {
    const loadScript = ({ src, type, innerHTML, async = true }) => {
      const script = document.createElement("script");
      if (src) script.src = src;
      if (type) script.type = type;
      if (innerHTML) script.innerHTML = innerHTML;
      script.async = async;
      document.body.appendChild(script);
      return script;
    };

    // Establece la variable global para saber si AR está activo
    window.arActive = arActive;

    const scripts = [];
    if (arActive) {
      scripts.push(loadScript({ src: "//unpkg.com/aframe" }));
      scripts.push(loadScript({ src: "//unpkg.com/@ar-js-org/ar.js" }));
      scripts.push(loadScript({ src: "//unpkg.com/3d-force-graph-ar" }));
    } else {
      scripts.push(loadScript({ src: "//unpkg.com/3d-force-graph@1.70.0" }));
    }

    scripts.push(loadScript({ src: "//unpkg.com/three@0.160.0" }));

    const importMapContent = `{
  "imports": {
    "three": "//unpkg.com/three@0.160.0/build/three.module.js",
    "three/addons/": "//unpkg.com/three@0.160.0/examples/jsm/"
  }
}`;
    scripts.push(loadScript({ type: "importmap", innerHTML: importMapContent, async: false }));
    scripts.push(loadScript({ src: "/javascripts/index.js", type: "module" }));
    scripts.push(loadScript({ src: "https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js", type: "text/javascript" }));

    // Cargamos el shader. Aquí se muestra un fragmento; puedes agregar el código completo que necesites.
    const shaderCode = `float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec3 mod289(vec3 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
// ... resto del código del shader
`;
    scripts.push(loadScript({ type: "x-shader/x-fragment", innerHTML: shaderCode, async: false }));

    return () => {
      scripts.forEach(script => {
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
    };
  }, [arActive]);

  return null;
};

export default ScriptLoader;
