// Lector/escritor CSV sin dependencias — subconjunto de RFC 4180, suficiente para
// data/curaduria/*.csv: separador `,`, fin de línea `\n`, comillado solo cuando hace falta.
import assert from 'node:assert/strict'

function escaparCampo(valor: string | undefined): string {
  const v = valor ?? ''
  if (v.includes('\n') || v.includes('\r')) {
    throw new Error(`valor de CSV contiene salto de línea, no soportado: ${JSON.stringify(v)}`)
  }
  if (v.includes(',') || v.includes('"')) {
    return `"${v.replaceAll('"', '""')}"`
  }
  return v
}

export function escribirCsv(columnas: string[], filas: Record<string, string>[]): string {
  const lineas = [columnas.map(escaparCampo).join(',')]
  for (const fila of filas) {
    lineas.push(columnas.map((c) => escaparCampo(fila[c])).join(','))
  }
  return lineas.join('\n') + '\n'
}

function parsearLinea(linea: string, numeroLinea: number): string[] {
  const campos: string[] = []
  let actual = ''
  let entreComillas = false
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i]
    if (entreComillas) {
      if (c === '"') {
        if (linea[i + 1] === '"') {
          actual += '"'
          i++
        } else {
          entreComillas = false
        }
      } else {
        actual += c
      }
    } else if (c === '"') {
      entreComillas = true
    } else if (c === ',') {
      campos.push(actual)
      actual = ''
    } else {
      actual += c
    }
  }
  if (entreComillas) {
    throw new Error(`comillas sin cerrar en línea ${numeroLinea}`)
  }
  campos.push(actual)
  return campos
}

export function leerCsv(texto: string): Record<string, string>[] {
  const lineas = texto.split(/\r\n|\n/)
  if (lineas.at(-1) === '') lineas.pop()
  if (lineas.length === 0) return []

  const encabezado = parsearLinea(lineas[0], 1)
  const filas: Record<string, string>[] = []
  for (let i = 1; i < lineas.length; i++) {
    const campos = parsearLinea(lineas[i], i + 1)
    if (campos.length !== encabezado.length) {
      throw new Error(
        `línea ${i + 1}: ${campos.length} campos, se esperaban ${encabezado.length}`
      )
    }
    const fila: Record<string, string> = {}
    encabezado.forEach((clave, idx) => (fila[clave] = campos[idx]))
    filas.push(fila)
  }
  return filas
}

// node --experimental-strip-types scripts/migracion/csv.ts
if (process.argv[1]?.endsWith('csv.ts')) {
  const columnas = ['id', 'label', 'sub']
  const filas = [
    { id: 'a', label: 'Rama', sub: 'Gestorx Cultural, Curadorx, DJ' },
    { id: 'b', label: 'Con "comillas"', sub: '' },
  ]
  const texto = escribirCsv(columnas, filas)
  assert.deepEqual(leerCsv(texto), filas)
  console.log('csv ok')
}
