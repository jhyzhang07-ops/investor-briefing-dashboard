# Investor Briefing Dashboard

Open `index.html` in a browser to view the daily U.S. stock-investor briefing archive.

The daily automation writes each briefing into `data/briefings-data.js`. The dashboard keeps all dates in one place, marks archived days on the calendar, and lets you search prior briefings by ticker, topic, or source.

The briefing view includes a top-priority strip, a compare-with-previous-briefing panel, stock filters, and source confidence labels.

## Access From Phone

To view the dashboard from a phone on the same Wi-Fi, run:

```bash
bash scripts/serve_local.sh
```

Then open the shown local-network URL on your phone. For the current Wi-Fi network, that should be:

```text
http://192.168.71.77:8080
```

This local-network method only works while this Mac is awake, connected to the same Wi-Fi, and the server command is running.

## Publish Online

This is a static site, so it can be published with GitHub Pages, Netlify, Vercel, Cloudflare Pages, or any normal static host. The files that need to be hosted are:

- `index.html`
- `styles.css`
- `app.js`
- `data/briefings-data.js`
- `.nojekyll`

Publishing online makes the briefing visible to anyone with the URL unless the hosting provider is configured with access control.

Stock watch entries support directional setups and risk/reward labels:

```json
{
  "ticker": "NVDA",
  "direction": "long",
  "riskLevel": "yellow",
  "type": "AI infrastructure",
  "catalyst": "...",
  "why": "...",
  "risk": "..."
}
```

Risk colors mean `red` = high risk / potentially large return, `yellow` = medium risk / medium return, and `green` = lower risk / relatively smaller return.

Source confidence labels should be one of `Primary`, `Market data`, `High-quality reporting`, `Calendar`, or `Context`.

To manually archive a briefing JSON object:

```bash
python3 scripts/archive_briefing.py --input briefing.json
```

Each entry is keyed by `date`, so rerunning the same date replaces that day instead of creating duplicates.
