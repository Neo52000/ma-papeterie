const loadedFonts = new Set<string>();

const GOOGLE_FONTS = [
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Lato',
  'Playfair Display',
  'Merriweather',
  'Oswald',
];

export function loadFont(fontFamily: string): Promise<void> {
  if (loadedFonts.has(fontFamily)) return Promise.resolve();

  // System fonts don't need loading
  const systemFonts = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];
  if (systemFonts.includes(fontFamily)) {
    loadedFonts.add(fontFamily);
    return Promise.resolve();
  }

  if (!GOOGLE_FONTS.includes(fontFamily)) {
    loadedFonts.add(fontFamily);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const linkId = `font-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
    if (document.getElementById(linkId)) {
      loadedFonts.add(fontFamily);
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;700&display=swap`;
    link.onload = () => {
      loadedFonts.add(fontFamily);
      // Small delay to ensure the font is actually available for canvas rendering
      setTimeout(resolve, 100);
    };
    link.onerror = () => {
      loadedFonts.add(fontFamily);
      resolve();
    };
    document.head.appendChild(link);
  });
}

export function loadAllFonts(): Promise<void[]> {
  return Promise.all(GOOGLE_FONTS.map(loadFont));
}
