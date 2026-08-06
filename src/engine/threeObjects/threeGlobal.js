import * as ThreeModule from 'three';

// Devuelve siempre la instancia vigente de THREE. Si A-Frame ya cargó, usa window.THREE; si no, usa el módulo.
export function resolveTHREE() {
	if (typeof globalThis !== 'undefined' && globalThis.THREE) {
		return globalThis.THREE;
	}
	return ThreeModule;
}

// Mantén un export con el valor inmediato (para compatibilidad), pero preferir resolveTHREE() en los consumidores.
export const THREE = resolveTHREE();

// ponytail: fija el comportamiento de color pre-r152 (hex crudo → shader, sin conversión
// sRGB→lineal implícita). Cada ThreeObject con shader propio fue calibrado visualmente contra ese
// comportamiento en three@0.147. Revisar si el motor adopta materiales PBR que esperan color lineal.
// Aplicado pero NO verificado visualmente — se verifica en la Fase 3, cuando los nodos rendericen.
THREE.ColorManagement.enabled = false;

export * from 'three';
