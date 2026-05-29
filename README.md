# Investor Briefing Dashboard

Open `index.html` in a browser to choose between the U.S. stock briefing archive and the A股 briefing archive.

The U.S. daily automation writes each briefing into `data/briefings-data.js`. The A股 daily automation writes each briefing into `data/a-share-briefings-data.js`. Each dashboard keeps all dates in one place, marks archived days on the calendar, and lets you search prior briefings by ticker, topic, or source.

The briefing view includes a top-priority strip, a compare-with-previous-briefing panel, stock filters, and source confidence labels.
The briefing includes sectors to watch, individual stocks to watch, small-cap stocks to watch, and ETFs to watch. ETFs are shown after the individual stock sections. ETF and stock tickers link to market quote pages and include suggested entry and profit-take zones when available. The return calculator estimates long or short trade return from entry, exit, and share count.

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
- `data/a-share-briefings-data.js`
- `assets/market-hero.png`
- `.nojekyll`

Publishing online makes the briefing visible to anyone with the URL unless the hosting provider is configured with access control.

After each local briefing update, publish the public GitHub Pages site with:

```bash
bash scripts/publish_dashboard.sh
```

The daily automations are configured to run this after they update their briefing data files, so the public site can refresh from the same archive.

To avoid manually running the publish command after dashboard edits, install the macOS auto-publisher once:

```bash
bash scripts/install_auto_publish.sh
```

It watches the dashboard files and runs `scripts/publish_dashboard.sh` after changes. To remove it later:

```bash
bash scripts/uninstall_auto_publish.sh
```

Stock watch entries support directional setups and risk/reward labels:

```json
{
  "ticker": "NVDA",
  "direction": "long",
  "riskLevel": "yellow",
  "suggestedBuyPrice": "Pullback toward support or confirmed breakout",
  "suggestedProfitTake": "Scale after a 3%-5% move or near resistance",
  "type": "AI infrastructure",
  "catalyst": "...",
  "why": "...",
  "risk": "..."
}
```

Risk colors mean `red` = high risk / potentially large return, `yellow` = medium risk / medium return, and `green` = lower risk / relatively smaller return.

Source confidence labels should be one of `Primary`, `Market data`, `High-quality reporting`, `Calendar`, or `Context`.

ETF watch entries use the same shape as stock entries. Leveraged ETFs such as `SOXL`, `SOXS`, `TQQQ`, or `SQQQ` should usually be marked higher risk unless the setup is unusually controlled.

Small-cap watch entries live under `smallCaps`. For A股 stock and A股 small-cap entries, include `chineseName` so the dashboard can show the Chinese name under the code.

To manually archive a briefing JSON object:

```bash
python3 scripts/archive_briefing.py --input briefing.json
```

To manually archive an A股 briefing JSON object:

```bash
python3 scripts/archive_briefing.py --input a-share-briefing.json --data-file data/a-share-briefings-data.js --window-var A_SHARE_BRIEFINGS
```

Each entry is keyed by `date`, so rerunning the same date replaces that day instead of creating duplicates.
