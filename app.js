(function () {
  const MARKET_CONFIGS = {
    us: {
      hash: "#us",
      bodyClass: "market-us",
      navLabel: "US stock",
      documentTitle: "U.S. Investor Briefing Dashboard",
      brandTitle: "Investor Briefing",
      dashboardEyebrow: "Daily 8:00 Asia/Shanghai",
      source: () => window.MARKET_BRIEFINGS,
      emptyTitle: "Waiting for the first daily U.S. brief",
      emptyDescription: "The U.S. stock automation will add the first entry here after its next 8:00 AM Asia/Shanghai run.",
      noDateDescription: "Select a marked calendar date, use Latest, or wait for the next scheduled 8:00 AM run.",
      forecastTitle: "Forecast For Tonight's U.S. Market",
      stocksTitle: "U.S. Stocks To Watch",
      smallCapsTitle: "U.S. Small-Cap Stocks To Watch",
      jumpLabels: {
        overview: "Overview",
        compare: "Compare",
        forecast: "Forecast",
        sectors: "Sectors",
        stocks: "Large Caps",
        smallCaps: "Small Caps",
        etfs: "ETFs",
        calculator: "Calculator",
        sources: "Sources"
      },
      noEtfsMessage: "No ETFs archived for this briefing.",
      noStocksMessage: "No stocks archived for this briefing.",
      noSmallCapsMessage: "No U.S. small-cap stocks archived for this briefing.",
      searchPlaceholder: "Ticker, topic, source",
      currency: "USD",
      currencyLocale: "en-US",
      tickerUrl: (ticker) => {
        const yahooTicker = ticker.replace(/\./g, "-").replace(/\s+/g, "");
        return `https://finance.yahoo.com/quote/${encodeURIComponent(yahooTicker)}`;
      },
      tickerTitle: (ticker) => `Open ${ticker} on Yahoo Finance`
    },
    cn: {
      hash: "#cn",
      bodyClass: "market-cn",
      navLabel: "A股",
      documentTitle: "A股 Investor Briefing Dashboard",
      brandTitle: "A股 Briefing",
      dashboardEyebrow: "Daily 8:00 Asia/Shanghai",
      source: () => window.A_SHARE_BRIEFINGS,
      emptyTitle: "Waiting for the first daily A股 brief",
      emptyDescription: "The A股 automation will add the first entry here after its next 8:00 AM Asia/Shanghai run.",
      noDateDescription: "Select a marked calendar date, use Latest, or wait for the next scheduled 8:00 AM run.",
      forecastTitle: "Forecast For Today's A股 Market",
      stocksTitle: "A股 Stocks To Watch",
      smallCapsTitle: "A股 小盘股观察",
      jumpLabels: {
        overview: "概览",
        compare: "对比",
        forecast: "情景",
        sectors: "板块",
        stocks: "大盘/核心",
        smallCaps: "小盘股",
        etfs: "ETF",
        calculator: "计算器",
        sources: "来源"
      },
      noEtfsMessage: "No A股 ETFs archived for this briefing.",
      noStocksMessage: "No A股 stocks archived for this briefing.",
      noSmallCapsMessage: "No A股 small-cap stocks archived for this briefing.",
      searchPlaceholder: "Ticker, sector, policy, source",
      currency: "CNY",
      currencyLocale: "zh-CN",
      tickerUrl: (ticker) => getAshareTickerUrl(ticker),
      tickerTitle: (ticker) => `Open ${ticker} on Eastmoney`
    }
  };

  const marketStates = {};
  let currentMarketKey = null;
  let currentMarket = null;

  const els = {
    landingView: document.getElementById("landingView"),
    dashboardShell: document.getElementById("dashboardShell"),
    brandTitle: document.getElementById("brandTitle"),
    dashboardEyebrow: document.getElementById("dashboardEyebrow"),
    sectionJump: document.getElementById("sectionJump"),
    calendarGrid: document.getElementById("calendarGrid"),
    calendarLabel: document.getElementById("calendarLabel"),
    archiveList: document.getElementById("archiveList"),
    briefingCount: document.getElementById("briefingCount"),
    selectedDateLabel: document.getElementById("selectedDateLabel"),
    briefingTitle: document.getElementById("briefingTitle"),
    briefingView: document.getElementById("briefingView"),
    searchInput: document.getElementById("searchInput"),
    prevMonth: document.getElementById("prevMonth"),
    nextMonth: document.getElementById("nextMonth"),
    homeButton: document.getElementById("homeButton"),
    latestButton: document.getElementById("latestButton"),
    printButton: document.getElementById("printButton"),
    marketLinks: Array.from(document.querySelectorAll("[data-open-market]"))
  };

  els.prevMonth.addEventListener("click", () => {
    const state = getCurrentState();
    if (!state) return;
    state.visibleMonth = addMonths(state.visibleMonth, -1);
    renderCalendar();
  });

  els.nextMonth.addEventListener("click", () => {
    const state = getCurrentState();
    if (!state) return;
    state.visibleMonth = addMonths(state.visibleMonth, 1);
    renderCalendar();
  });

  els.homeButton.addEventListener("click", () => {
    history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
    showLanding();
  });

  els.latestButton.addEventListener("click", () => {
    const state = getCurrentState();
    if (!state || !state.latest) return;
    state.selectedDate = state.latest.date;
    state.visibleMonth = monthFromKey(state.latest.date);
    render();
  });

  els.printButton.addEventListener("click", () => window.print());

  els.searchInput.addEventListener("input", (event) => {
    const state = getCurrentState();
    if (!state) return;
    state.searchTerm = event.target.value.trim().toLowerCase();
    renderArchive();
  });

  window.addEventListener("hashchange", syncRoute);
  syncRoute();

  function syncRoute() {
    const marketKey = marketKeyFromHash(window.location.hash);
    if (!marketKey) {
      showLanding();
      return;
    }
    showMarket(marketKey);
  }

  function showLanding() {
    currentMarketKey = null;
    currentMarket = null;
    document.title = "Investor Briefing Dashboard";
    document.body.classList.remove("dashboard-active", "market-us", "market-cn");
    document.body.classList.add("landing-active");
    els.landingView.hidden = false;
    els.dashboardShell.hidden = true;
    setActiveMarketLinks(null);
  }

  function showMarket(marketKey) {
    currentMarketKey = marketKey;
    currentMarket = MARKET_CONFIGS[marketKey];
    marketStates[marketKey] = marketStates[marketKey] || createMarketState(currentMarket);

    document.title = currentMarket.documentTitle;
    document.body.classList.remove("landing-active", "market-us", "market-cn");
    document.body.classList.add("dashboard-active", currentMarket.bodyClass);
    els.landingView.hidden = true;
    els.dashboardShell.hidden = false;

    syncMarketChrome();
    render();
  }

  function syncMarketChrome() {
    const state = getCurrentState();
    els.brandTitle.textContent = currentMarket.brandTitle;
    els.dashboardEyebrow.textContent = currentMarket.dashboardEyebrow;
    els.searchInput.placeholder = currentMarket.searchPlaceholder;
    els.searchInput.value = state.searchTerm;
    setActiveMarketLinks(currentMarketKey);
  }

  function setActiveMarketLinks(marketKey) {
    els.marketLinks.forEach((link) => {
      const isActive = link.dataset.openMarket === marketKey;
      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function createMarketState(config) {
    const briefings = Array.isArray(config.source())
      ? config.source().slice().sort((a, b) => b.date.localeCompare(a.date))
      : [];
    const latest = briefings[0] || null;

    return {
      briefings,
      byDate: new Map(briefings.map((brief) => [brief.date, brief])),
      latest,
      selectedDate: latest ? latest.date : toDateKey(new Date()),
      visibleMonth: latest ? monthFromKey(latest.date) : startOfMonth(new Date()),
      searchTerm: "",
      stockFilters: {
        direction: "all",
        riskLevel: "all"
      }
    };
  }

  function getCurrentState() {
    return currentMarketKey ? marketStates[currentMarketKey] : null;
  }

  function render() {
    renderCalendar();
    renderArchive();
    renderBriefing();
  }

  function renderCalendar() {
    const state = getCurrentState();
    if (!state) return;

    els.calendarLabel.textContent = state.visibleMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    });

    const first = startOfMonth(state.visibleMonth);
    const offset = (first.getDay() + 6) % 7;
    const start = addDays(first, -offset);
    const days = Array.from({ length: 42 }, (_, index) => addDays(start, index));

    els.calendarGrid.innerHTML = days.map((day) => {
      const key = toDateKey(day);
      const classes = [
        "day-button",
        day.getMonth() === state.visibleMonth.getMonth() ? "in-month" : "",
        state.byDate.has(key) ? "has-brief" : "",
        key === state.selectedDate ? "active" : ""
      ].filter(Boolean).join(" ");
      return `<button class="${classes}" type="button" data-date="${key}" aria-label="${key}">${day.getDate()}</button>`;
    }).join("");

    els.calendarGrid.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedDate = button.dataset.date;
        render();
      });
    });
  }

  function renderArchive() {
    const state = getCurrentState();
    if (!state) return;

    const filtered = state.briefings.filter((brief) => {
      if (!state.searchTerm) return true;
      return JSON.stringify(brief).toLowerCase().includes(state.searchTerm);
    });

    els.briefingCount.textContent = String(state.briefings.length);
    els.archiveList.innerHTML = filtered.length
      ? filtered.map((brief) => `
          <button class="archive-item ${brief.date === state.selectedDate ? "active" : ""}" type="button" data-date="${escapeHtml(brief.date)}">
            <strong>${escapeHtml(displayDate(brief.date))}</strong>
            <span>${escapeHtml(brief.tone || brief.title || "Daily briefing")}</span>
          </button>
        `).join("")
      : `<p class="empty-note">No archived briefings match that search.</p>`;

    els.archiveList.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedDate = button.dataset.date;
        state.visibleMonth = monthFromKey(state.selectedDate);
        render();
      });
    });
  }

  function renderBriefing() {
    const state = getCurrentState();
    if (!state) return;

    const brief = state.byDate.get(state.selectedDate);

    els.selectedDateLabel.textContent = brief
      ? `${displayDate(brief.date)} | ${brief.timezone || "Asia/Shanghai"}`
      : `${displayDate(state.selectedDate)} | No archive entry`;
    els.briefingTitle.textContent = brief ? brief.title : "No briefing for this date";

    if (!brief) {
      els.sectionJump.innerHTML = "";
      els.briefingView.innerHTML = `
        <section class="empty-state">
          <h3>${state.briefings.length ? `No briefing for ${escapeHtml(displayDate(state.selectedDate))}` : escapeHtml(currentMarket.emptyTitle)}</h3>
          <p>${escapeHtml(state.briefings.length ? currentMarket.noDateDescription : currentMarket.emptyDescription)}</p>
        </section>
      `;
      return;
    }

    renderSectionJump(brief);

    els.briefingView.innerHTML = `
      <section class="hero-summary" id="brief-overview">
        <div>
          <p class="tone">${escapeHtml(brief.tone || "Market tone pending")}</p>
          ${renderPriorityStrip(brief)}
          ${renderList(brief.summary, "summary-list")}
        </div>
        <div class="overview-panel">
          ${renderAtAGlance(brief)}
          <div class="market-grid">
            ${renderMarketPulse(brief.marketPulse)}
          </div>
        </div>
      </section>

      ${renderSection("Compare With Previous Briefing", renderComparePanel(brief), "brief-compare")}
      ${renderSection(currentMarket.forecastTitle, renderList(brief.forecast, "forecast-list"), "brief-forecast")}
      ${renderSection("Sectors To Watch", renderSectors(brief.sectors), "brief-sectors")}
      ${renderSection(currentMarket.stocksTitle, renderStocks(brief.stocks), "brief-stocks")}
      ${renderSection(currentMarket.smallCapsTitle, renderWatchCards(brief.smallCaps, currentMarket.noSmallCapsMessage), "brief-smallcaps")}
      ${renderSection("ETFs To Watch", renderWatchCards(brief.etfs, currentMarket.noEtfsMessage), "brief-etfs")}
      ${renderSection("Return Calculator", renderCalculator(), "brief-calculator")}
      ${(brief.sections || []).map((section) => renderSection(section.title, renderList(section.items, "section-list"))).join("")}
      ${renderSection("Sources", renderSources(brief.sources), "brief-sources")}
    `;

    attachStockFilterHandlers();
    attachCalculatorHandlers();
    attachJumpHandlers();
  }

  function renderSection(title, body, id) {
    const idAttribute = id ? ` id="${escapeAttribute(id)}"` : "";
    return `
      <section class="brief-section"${idAttribute}>
        <h3>${escapeHtml(title)}</h3>
        ${body}
      </section>
    `;
  }

  function renderSectionJump(brief) {
    const labels = currentMarket.jumpLabels;
    const items = [
      ["brief-overview", labels.overview, true],
      ["brief-compare", labels.compare, true],
      ["brief-forecast", labels.forecast, true],
      ["brief-sectors", labels.sectors, hasItems(brief.sectors)],
      ["brief-stocks", labels.stocks, hasItems(brief.stocks)],
      ["brief-smallcaps", labels.smallCaps, hasItems(brief.smallCaps)],
      ["brief-etfs", labels.etfs, hasItems(brief.etfs)],
      ["brief-calculator", labels.calculator, true],
      ["brief-sources", labels.sources, hasItems(brief.sources)]
    ].filter((item) => item[2]);

    els.sectionJump.innerHTML = `
      <span>Jump To</span>
      <div>
        ${items.map(([target, label]) => `<button type="button" data-scroll-target="${escapeAttribute(target)}">${escapeHtml(label)}</button>`).join("")}
      </div>
    `;
  }

  function attachJumpHandlers() {
    els.sectionJump.querySelectorAll("[data-scroll-target]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.scrollTarget);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function renderAtAGlance(brief) {
    const watchItems = [
      ...(Array.isArray(brief.stocks) ? brief.stocks : []),
      ...(Array.isArray(brief.smallCaps) ? brief.smallCaps : []),
      ...(Array.isArray(brief.etfs) ? brief.etfs : [])
    ];
    const longs = watchItems.filter((item) => normalizeDirection(item.direction).className === "long").length;
    const shorts = watchItems.filter((item) => normalizeDirection(item.direction).className === "short").length;
    const redRisks = watchItems.filter((item) => normalizeRiskLevel(item.riskLevel).value === "red").length;

    const tiles = [
      ["Sectors", countItems(brief.sectors)],
      ["Large cap", countItems(brief.stocks)],
      ["Small cap", countItems(brief.smallCaps)],
      ["ETFs", countItems(brief.etfs)],
      ["Long / Short", `${longs}/${shorts}`],
      ["Red risk", redRisks]
    ];

    return `
      <div class="glance-grid" aria-label="Briefing at a glance">
        ${tiles.map(([label, value]) => `
          <div class="glance-tile">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(String(value))}</strong>
          </div>
        `).join("")}
      </div>
    `;
  }

  function hasItems(items) {
    return Array.isArray(items) && items.length > 0;
  }

  function countItems(items) {
    return hasItems(items) ? items.length : 0;
  }

  function renderList(items, className) {
    const safeItems = Array.isArray(items) ? items : [];
    if (!safeItems.length) return `<p class="empty-note">No items archived for this section.</p>`;
    return `<ul class="${className}">${safeItems.map((item) => `<li>${escapeHtml(String(item))}</li>`).join("")}</ul>`;
  }

  function renderMarketPulse(pulse) {
    if (!pulse || typeof pulse !== "object") {
      return `<p class="empty-note">No market pulse archived.</p>`;
    }

    return Object.entries(pulse).map(([label, data]) => `
      <div class="market-tile">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(data && data.value ? data.value : "N/A")}</strong>
        <p>${escapeHtml(data && data.note ? data.note : "")}</p>
      </div>
    `).join("");
  }

  function renderPriorityStrip(brief) {
    const priorities = Array.isArray(brief.priorities) && brief.priorities.length
      ? brief.priorities
      : Array.isArray(brief.summary)
        ? brief.summary.slice(0, 3)
        : [];

    if (!priorities.length) return "";

    return `
      <div class="priority-strip" aria-label="Today's priority">
        <strong>Today's priority</strong>
        <ol>
          ${priorities.slice(0, 5).map((item) => `<li>${escapeHtml(String(item))}</li>`).join("")}
        </ol>
      </div>
    `;
  }

  function renderComparePanel(brief) {
    const previous = getPreviousBriefing(brief.date);
    if (!previous) {
      return `<p class="empty-note">Comparison will appear after at least two daily briefings are archived.</p>`;
    }

    const currentStocks = flattenStocks(brief.stocks);
    const previousStocks = flattenStocks(previous.stocks);
    const currentByTicker = new Map(currentStocks.map((stock) => [stock.key, stock]));
    const previousByTicker = new Map(previousStocks.map((stock) => [stock.key, stock]));

    const added = currentStocks.filter((stock) => !previousByTicker.has(stock.key));
    const removed = previousStocks.filter((stock) => !currentByTicker.has(stock.key));
    const directionChanges = currentStocks.filter((stock) => {
      const oldStock = previousByTicker.get(stock.key);
      return oldStock && stock.direction !== oldStock.direction;
    });
    const repeatedRisks = currentStocks.filter((stock) => {
      const oldStock = previousByTicker.get(stock.key);
      return oldStock && stock.riskLevel === "red" && oldStock.riskLevel === "red";
    });

    const cards = [
      compareCard("New Watchlist Names", added, (stock) => `${stock.ticker} (${stock.directionLabel})`),
      compareCard("Removed Names", removed, (stock) => stock.ticker),
      compareCard("Direction Changes", directionChanges, (stock) => {
        const oldStock = previousByTicker.get(stock.key);
        return `${stock.ticker}: ${oldStock.directionLabel} -> ${stock.directionLabel}`;
      }),
      compareCard("Repeated Red Risks", repeatedRisks, (stock) => `${stock.ticker}: ${stock.type}`)
    ];

    return `
      <div class="compare-note">Compared with ${escapeHtml(displayDate(previous.date))}</div>
      <div class="compare-grid">${cards.join("")}</div>
    `;
  }

  function compareCard(title, stocks, formatter) {
    return `
      <div class="compare-card">
        <strong>${escapeHtml(title)}</strong>
        ${stocks.length
          ? `<ul>${stocks.slice(0, 8).map((stock) => `<li>${escapeHtml(formatter(stock))}</li>`).join("")}</ul>`
          : `<p>No notable changes.</p>`}
      </div>
    `;
  }

  function renderStocks(stocks) {
    const safeStocks = Array.isArray(stocks) ? stocks : [];
    if (!safeStocks.length) return `<p class="empty-note">${escapeHtml(currentMarket.noStocksMessage)}</p>`;
    const filteredStocks = safeStocks.filter((stock) => stockMatchesFilters(stock));

    return `
      <div class="stock-controls" aria-label="Stock filters">
        <div>
          <span>Direction</span>
          ${filterButton("direction", "all", "All")}
          ${filterButton("direction", "long", "Long")}
          ${filterButton("direction", "short", "Short")}
        </div>
        <div>
          <span>Risk</span>
          ${filterButton("riskLevel", "all", "All")}
          ${filterButton("riskLevel", "red", "Red")}
          ${filterButton("riskLevel", "yellow", "Yellow")}
          ${filterButton("riskLevel", "green", "Green")}
        </div>
      </div>
      ${renderWatchCards(filteredStocks, "No stocks match the selected filters.")}
    `;
  }

  function renderSectors(sectors) {
    const safeSectors = Array.isArray(sectors) ? sectors : [];
    if (!safeSectors.length) return `<p class="empty-note">No sector watchlist archived for this briefing.</p>`;

    return `
      <div class="sector-grid">
        ${safeSectors.map((sector) => {
          const direction = normalizeDirection(sector.direction);
          const riskLevel = normalizeRiskLevel(sector.riskLevel);
          return `
            <div class="sector-card">
              <div class="sector-head">
                <strong>${escapeHtml(sector.name || "Sector")}</strong>
                <div>
                  <span class="direction-pill ${direction.className}">${escapeHtml(direction.label)}</span>
                  <span class="risk-pill ${riskLevel.className}">${escapeHtml(riskLevel.label)}</span>
                </div>
              </div>
              <p><strong>Catalyst:</strong> ${escapeHtml(sector.catalyst || "N/A")}</p>
              <p><strong>Watch:</strong> ${escapeHtml(sector.watch || sector.why || "N/A")}</p>
              <p><strong>Risk:</strong> ${escapeHtml(sector.risk || "N/A")}</p>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderWatchCards(items, emptyMessage) {
    const safeItems = Array.isArray(items) ? items : [];
    if (!safeItems.length) return `<p class="empty-note">${escapeHtml(emptyMessage)}</p>`;

    return `
      <div class="stock-table">
        ${safeItems.map((item) => {
          const direction = normalizeDirection(item.direction);
          const riskLevel = normalizeRiskLevel(item.riskLevel);
          return `
            <div class="stock-row">
              <div class="ticker">${renderTickerBlock(item)}</div>
              <div class="stock-detail">
                <div class="stock-meta">
                  <span class="direction-pill ${direction.className}">${escapeHtml(direction.label)}</span>
                  <span class="risk-pill ${riskLevel.className}">${escapeHtml(riskLevel.label)}</span>
                  <span class="tagline">${escapeHtml(item.type || "watch item")}</span>
                </div>
                <div class="trade-levels">
                  <div>
                    <span>Suggested entry</span>
                    <strong>${escapeHtml(item.suggestedBuyPrice || item.entry || "Not specified")}</strong>
                  </div>
                  <div>
                    <span>Profit take</span>
                    <strong>${escapeHtml(item.suggestedProfitTake || item.profitTake || "Not specified")}</strong>
                  </div>
                </div>
                <p><strong>Catalyst:</strong> ${escapeHtml(item.catalyst || "N/A")}</p>
                <p><strong>Why it matters:</strong> ${escapeHtml(item.why || "N/A")}</p>
                <p><strong>Risk:</strong> ${escapeHtml(item.risk || "N/A")}</p>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderTickerLinks(tickerValue) {
    const tickers = String(tickerValue || "N/A").split(/[\/,，、]+/);
    return tickers.map((ticker) => {
      const cleanTicker = ticker.trim();
      if (!cleanTicker || cleanTicker === "N/A") return escapeHtml(cleanTicker || "N/A");
      const href = currentMarket.tickerUrl(cleanTicker);
      return `<a href="${escapeAttribute(href)}" target="_blank" rel="noreferrer" title="${escapeAttribute(currentMarket.tickerTitle(cleanTicker))}">${escapeHtml(cleanTicker)}</a>`;
    }).join("<span>/</span>");
  }

  function renderTickerBlock(item) {
    const chineseName = item.chineseName || item.nameCn || item.cnName || "";
    return `
      ${renderTickerLinks(item.ticker)}
      ${chineseName ? `<small>${escapeHtml(chineseName)}</small>` : ""}
    `;
  }

  function renderCalculator() {
    return `
      <div class="calculator-grid">
        <label>
          <span>Entry price</span>
          <input id="calcEntry" type="number" inputmode="decimal" min="0" step="0.01" placeholder="100.00">
        </label>
        <label>
          <span>Exit price</span>
          <input id="calcExit" type="number" inputmode="decimal" min="0" step="0.01" placeholder="115.00">
        </label>
        <label>
          <span>Shares</span>
          <input id="calcShares" type="number" inputmode="decimal" min="0" step="1" placeholder="100">
        </label>
        <label>
          <span>Direction</span>
          <select id="calcDirection">
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </label>
      </div>
      <div class="calculator-result" id="calculatorResult">
        Enter trade values to calculate estimated return.
      </div>
    `;
  }

  function attachCalculatorHandlers() {
    ["calcEntry", "calcExit", "calcShares", "calcDirection"].forEach((id) => {
      const input = document.getElementById(id);
      if (input) input.addEventListener("input", updateCalculator);
    });
    updateCalculator();
  }

  function updateCalculator() {
    const entry = Number(document.getElementById("calcEntry")?.value || 0);
    const exit = Number(document.getElementById("calcExit")?.value || 0);
    const shares = Number(document.getElementById("calcShares")?.value || 0);
    const direction = document.getElementById("calcDirection")?.value || "long";
    const result = document.getElementById("calculatorResult");
    if (!result) return;

    if (entry <= 0 || exit <= 0 || shares <= 0) {
      result.textContent = "Enter trade values to calculate estimated return.";
      result.className = "calculator-result";
      return;
    }

    const perShare = direction === "short" ? entry - exit : exit - entry;
    const totalReturn = perShare * shares;
    const capital = entry * shares;
    const returnPercent = capital ? (totalReturn / capital) * 100 : 0;

    result.className = `calculator-result ${totalReturn >= 0 ? "positive" : "negative"}`;
    result.textContent = `${formatCurrency(totalReturn)} estimated ${totalReturn >= 0 ? "gain" : "loss"} (${formatPercent(returnPercent)}) on ${formatCurrency(capital)} notional.`;
  }

  function filterButton(group, value, label) {
    const state = getCurrentState();
    const active = state.stockFilters[group] === value ? "active" : "";
    return `<button class="filter-chip ${active}" type="button" data-filter-group="${escapeAttribute(group)}" data-filter-value="${escapeAttribute(value)}">${escapeHtml(label)}</button>`;
  }

  function attachStockFilterHandlers() {
    els.briefingView.querySelectorAll("[data-filter-group]").forEach((button) => {
      button.addEventListener("click", () => {
        const state = getCurrentState();
        state.stockFilters[button.dataset.filterGroup] = button.dataset.filterValue;
        renderBriefing();
      });
    });
  }

  function stockMatchesFilters(stock) {
    const state = getCurrentState();
    const direction = normalizeDirection(stock.direction).className;
    const riskLevel = normalizeRiskLevel(stock.riskLevel).value;
    return (state.stockFilters.direction === "all" || state.stockFilters.direction === direction)
      && (state.stockFilters.riskLevel === "all" || state.stockFilters.riskLevel === riskLevel);
  }

  function normalizeDirection(direction) {
    const value = String(direction || "").toLowerCase();
    if (value === "short") return { label: "Short", className: "short" };
    if (value === "long") return { label: "Long", className: "long" };
    return { label: "Watch", className: "neutral" };
  }

  function normalizeRiskLevel(riskLevel) {
    const value = String(riskLevel || "").toLowerCase();
    if (value === "red" || value === "high") {
      return { label: "Red: High risk / high return", className: "red", value: "red" };
    }
    if (value === "green" || value === "low") {
      return { label: "Green: Lower risk / lower return", className: "green", value: "green" };
    }
    if (value === "yellow" || value === "medium") {
      return { label: "Yellow: Medium risk / medium return", className: "yellow", value: "yellow" };
    }
    return { label: "Risk not rated", className: "neutral", value: "neutral" };
  }

  function renderSources(sources) {
    const safeSources = Array.isArray(sources) ? sources : [];
    if (!safeSources.length) return `<p class="empty-note">No sources archived.</p>`;

    return `
      <div class="source-list">
        ${safeSources.map((source) => `
          <a href="${escapeAttribute(source.url || "#")}" target="_blank" rel="noreferrer">
            <span>${escapeHtml(source.confidence || "Source")}</span>
            ${escapeHtml(source.label || source.url || "Source")}
          </a>
        `).join("")}
      </div>
    `;
  }

  function getPreviousBriefing(date) {
    const state = getCurrentState();
    const index = state.briefings.findIndex((brief) => brief.date === date);
    return index >= 0 ? state.briefings[index + 1] || null : null;
  }

  function flattenStocks(stocks) {
    return (Array.isArray(stocks) ? stocks : []).flatMap((stock) => {
      const tickers = String(stock.ticker || "N/A").split(/[\/,，、]+/);
      return tickers.map((ticker) => {
        const cleanTicker = ticker.trim();
        const direction = normalizeDirection(stock.direction);
        const riskLevel = normalizeRiskLevel(stock.riskLevel);
        return {
          key: cleanTicker.toUpperCase(),
          ticker: cleanTicker,
          type: stock.type || "watch item",
          direction: direction.className,
          directionLabel: direction.label,
          riskLevel: riskLevel.value
        };
      });
    });
  }

  function marketKeyFromHash(hash) {
    const normalized = decodeURIComponent(String(hash || "").replace(/^#/, "")).trim().toLowerCase();
    if (["us", "us-stock", "usstock", "usa"].includes(normalized)) return "us";
    if (["cn", "a", "ashare", "a-share", "china", "a股"].includes(normalized)) return "cn";
    return null;
  }

  function getAshareTickerUrl(ticker) {
    const clean = ticker.trim().toUpperCase();
    const match = clean.match(/^(\d{6})(?:\.(SH|SS|SZ|BJ))?$/);
    if (!match) {
      return `https://www.eastmoney.com/`;
    }

    const code = match[1];
    const exchange = match[2] || inferAshareExchange(code);
    const eastmoneyPrefix = exchange === "SZ" ? "sz" : exchange === "BJ" ? "bj" : "sh";
    return `https://quote.eastmoney.com/${eastmoneyPrefix}${code}.html`;
  }

  function inferAshareExchange(code) {
    if (/^[023]/.test(code)) return "SZ";
    if (/^[48]/.test(code)) return "BJ";
    return "SH";
  }

  function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function displayDate(key) {
    const date = monthFromKey(key);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function monthFromKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day || 1);
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function addMonths(date, months) {
    return new Date(date.getFullYear(), date.getMonth() + months, 1);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat(currentMarket.currencyLocale, {
      style: "currency",
      currency: currentMarket.currency,
      maximumFractionDigits: 2
    }).format(value);
  }

  function formatPercent(value) {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  }
})();
