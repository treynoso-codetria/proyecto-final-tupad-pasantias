// URL-friendly identifier of a category or tag, derived from its name:
// "Diseño UX/UI" → "diseno-ux-ui", "Node.js" → "nodejs". Symbols that tell
// technologies apart are spelled out ("C++" → "c-plus-plus", "C#" →
// "c-sharp"), so similar names do not end up with the same slug. Returns ''
// when the name has nothing usable.
export function slugify(name: string): string {
  return (
    name
      .normalize('NFD')
      // Accents: "é" is "e" plus a combining mark.
      .replace(/\p{Mn}/gu, '')
      .toLowerCase()
      .replace(/\+/g, '-plus-')
      .replace(/#/g, '-sharp-')
      // Dots join words ("node.js", "asp.net") instead of separating them.
      .replace(/\./g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}
