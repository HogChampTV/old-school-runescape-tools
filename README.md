# Old School RuneScape Tools

Small browser tools for **Old School RuneScape**, served as a static site on
GitHub Pages: <https://hogchamptv.github.io/old-school-runescape-tools/>

> **Disclaimer:** This site is not affiliated with Jagex Ltd. or Old School
> RuneScape. Game data and names belong to their respective owners. This is a
> non-commercial fan project.

## Tools

- **TzHaar Name Generator** — hatches volcanic creature names from TzHaar
  syllables, with a contamination slider and an optional base name to graft in.

More small tools and calculators are planned.

## Development

Requires Node.js 22+.

```bash
npm install
npm run dev      # Vite dev server at http://localhost:3000
npm run build    # production build to dist/
```

Everything runs in the browser — there is no backend, no database, and no
tracking. Per-user settings live in localStorage.

### Adding a tool

1. Create `src/pages/tools/<Name>Page.jsx` (+ CSS).
2. Add a `<Route>` for it in `src/App.jsx`.
3. Add an entry to `TOOLS` in `src/site.js`; the nav bar and the home page
   cards pick it up from there.

## Deployment

Every push to `main` builds the site and deploys it to GitHub Pages via
`.github/workflows/deploy.yml`. There is nothing else to deploy or pay for.

## License

MIT

## Acknowledgements

- Syllables and inspiration from the
  [Old School RuneScape Wiki](https://oldschool.runescape.wiki/)
- All trademarks and IP belong to [Jagex Ltd.](https://www.jagex.com/)
