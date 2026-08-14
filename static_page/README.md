# Personal Site

A single-page personal site — one hand-written [`index.html`](index.html) with all
styles inline. Tailwind CSS and Google Fonts load from a CDN, so an internet
connection is required for it to look right.

## Running it

```bash
npm start
```

Then open <http://localhost:3000>.

**There is no `npm install` step** — this project has zero dependencies. `npm start`
just runs `node serve.mjs` for you, and `node serve.mjs` works on its own too.

## What's in here

| File | What it is |
|---|---|
| [`index.html`](index.html) | The entire site — markup, styles, and content. |
| [`serve.mjs`](serve.mjs) | A ~50-line static file server. You can ignore it. |

## Where to edit

Everything lives in `index.html`, in two places:

**The theme** is a block of CSS custom properties in `:root` at the top of the file.
Change a color once there and it updates everywhere:

```css
--background: #faf5f3;   /* page background  */
--foreground: #4a1420;   /* body text        */
--accent:     #a3243a;   /* links            */
--primary:    #b02a43;   /* buttons          */
--card:       #5a1a28;   /* maroon panels    */
```

The variants are tuned so text clears WCAG AA contrast against whatever surface it
sits on — if you change one, check the text on top of it still reads.

**The content** is four sections in the `<body>`, each marked with a comment and
reachable by anchor link:

| Section | Anchor |
|---|---|
| Hero | `#home` |
| About | `#about` |
| Selected work | `#work` |
| Footer / contact | `#contact` |
