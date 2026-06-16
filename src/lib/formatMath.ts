/** Render exponents in problem text, e.g. 2^31 → 2<sup>31</sup> */
export function formatMathNotation(text: string): string {
  return text.replace(/(\d+)\^(\d+)/g, "$1<sup>$2</sup>");
}