// app/src/utils/slug.ts
//
// TASK-014: turns a human label ("Yacht Clubs", "Oceanco", "Top 10 Builders
// by Fleet Size") into a filesystem/URL-safe, lowercase, hyphenated slug —
// used to build CSV export filenames (utils/csv.ts's downloadCsv) from
// whatever title a host view already shows on screen, so a downloaded file
// reads "yacht-clubs.csv" rather than a raw label with spaces/punctuation.
export function slugify(text: string): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining accents ("Ünïcode" -> "Unicode")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'export';
}
