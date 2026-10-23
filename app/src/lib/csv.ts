/**
 * Arquivo CSV em UTF-8 com BOM (EF BB BF) escrito em bytes: o Excel só reconhece os acentos quando o
 * BOM está no começo do arquivo, e um caractere invisível dentro do código-fonte pode se perder.
 */
export function csvBlob(texto: string): Blob {
  return new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), texto], { type: "text/csv;charset=utf-8;" });
}
