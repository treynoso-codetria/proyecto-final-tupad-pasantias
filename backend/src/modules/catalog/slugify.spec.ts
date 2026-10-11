import { slugify } from './slugify.js';

describe('slugify', () => {
  it.each([
    // The seed's catalog, whose slugs were written by hand.
    ['Desarrollo de Software', 'desarrollo-de-software'],
    ['Datos y Analítica', 'datos-y-analitica'],
    ['Diseño UX/UI', 'diseno-ux-ui'],
    ['Soporte Técnico', 'soporte-tecnico'],
    ['Node.js', 'nodejs'],
    ['Inglés', 'ingles'],
    ['  QA   y Testing ', 'qa-y-testing'],
  ])('%s → %s', (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it('keeps technologies that differ only in symbols apart', () => {
    expect(new Set(['C', 'C++', 'C#'].map(slugify)).size).toBe(3);
    expect(slugify('C++')).toBe('c-plus-plus');
    expect(slugify('C#')).toBe('c-sharp');
  });

  it('returns an empty slug when the name has no letters or digits', () => {
    expect(slugify('¡¿?!')).toBe('');
  });
});
