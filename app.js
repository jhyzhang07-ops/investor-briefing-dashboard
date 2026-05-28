(function () {
  const briefings = Array.isArray(window.MARKET_BRIEFINGS)
    ? window.MARKET_BRIEFINGS.slice().sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const byDate = new Map(briefings.map((brief) => [brief.date, brief]));
  const latest = briefings[0] || null;
  let selectedDate = latest ? latest.date : toDateKey(new Date());
  let visibleMonth = latest ? monthFromKey(latest.date) : startOfMonth(new Date());
  let searchTerm = "";
  let stockFilters = {
    direction: "all",
    riskLevel: "all"
  };

  const els = {
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
    latestButton: document.getElementById("latestButton"),
    printButton: document.getElementById("printButton")
  };

  els.prevMonth.addEventListener("click", () => {
    visibleMonth = addMonths(visibleMonth, -1);
    renderCalendar();
  });

  els.nextMonth.addEventListener("click", () => {
    visibleMonth = addMonths(visibleMonth, 1);
    renderCalendar();
  });

  els.latestButton.addEventListener("click", () => {
    if (!latest) return;
    selectedDate = latest.date;
    visibleMonth = monthFromKey(latest.date);
    render();
  });

  els.printButton.addEventListener("click", () => window.print());

  els.searchInput.addEventListener("input", (event) => {
    searchTerm = event.target.value.trim().toLowerCase();
    renderArchive();
  });

  render();

  function render() {
    renderCalendar();
    renderArchive();
    renderBriefing();
  }

  function renderCalendar() {
    els.calendarLabel.textContent = visibleMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    });

    const first = startOfMonth(visibleMonth);
    const offset = (first.getDay() + 6) % 7;
    const start = addDays(first, -offset);
    const days = Array.from({ length: 42 }, (_, index) => addDays(start, index));

    els.calendarGrid.innerHTML = days.map((day) => {
      const key = toDateKey(day);
      const classes = [
        "day-button",
        day.getMonth() === visibleMonth.getMonth() ? "in-month" : "",
        byDate.has(key) ? "has-brief" : "",
        key === selectedDate ? "active" : ""
      ].filter(Boolean).join(" ");
      return `<button class="${classes}" type="button" data-date="${key}" aria-label="${key}">${day.getDate()}</button>`;
    }).join("");

    els.calendarGrid.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        selectedDate = button.dataset.date;
        render();
      });
    });
  }

  function renderArchive() {
    const filtered = briefings.filter((brief) => {
      if (!searchTerm) return true;
      return JSON.stringify(brief).toLowerCase().includes(searchTerm);
    });

    els.briefingCount.textContent = String(briefings.length);
    els.archiveList.innerHTML = filtered.length
      ? filtered.map((brief) => `
          <button class="archive-item ${brief.date === selectedDate ? "active" : ""}" type="button" data-date="${escapeHtml(brief.date)}">
            <strong>${escapeHtml(displayDate(brief.date))}</strong>
            <span>${escapeHtml(brief.tone || brief.title || "Daily briefing")}</span>
          </button>
        `).join("")
      : `<p class="empty-note">No archived briefings match that search.</p>`;

    els.archiveList.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        selectedDate = button.dataset.date;
        visibleMonth = monthFromKey(selectedDate);
        render();
      });
    });
  }

  function renderBriefing() {
    const brief = byDate.get(selectedDate);

    els.selectedDateLabel.textContent = brief
      ? `${displayDate(brief.date)} | ${brief.timezone || "Asia/Shanghai"}`
      : `${displayDate(selectedDate)} | No archive entry`;
    els.briefingTitle.textContent = brief ? brief.title : "No briefing for this date";

    if (!brief) {
      els.briefingView.innerHTML = `
        <section class="empty-state">
          <h3>No briefing for ${escapeHtml(displayDate(selectedDate))}</h3>
          <p>Select a marked calendar date, use Latest, or wait for the next scheduled 8:00 AM run.</p>
        </section>
      `;
      return;
    }

    els.briefingView.innerHTML = `
      <section class="hero-summary">
        <div>
          <p class="tone">${escapeHtml(brief.tone || "Market tone pending")}</p>
          ${renderPriorityStrip(brief)}
          ${renderList(brief.summary, "summary-list")}
        </div>
        <div class="market-grid">
          ${renderMarketPulse(brief.marketPulse)}
        </div>
      </section>

      ${renderSection("Compare With Previous Briefing", renderComparePanel(brief))}
      ${renderSection("Forecast For Tonight's U.S. Market", renderList(brief.forecast, "forecast-list"))}
      ${renderSection("U.S. Stocks To Watch", renderStocks(brief.stocks))}
      ${renderSection("Return Calculator", renderCalculator())}
      ${(brief.sections || []).map((section) => renderSection(section.title, renderList(section.items, "section-list"))).join("")}
      ${renderSection("Sources", renderSources(brief.sources))}
    `;

    attachStockFilterHandlers();
    attachCalculatorHandlers();
  }

  function renderSection(title, body) {
    return `
      <section class="brief-section">
        <h3>${escapeHtml(title)}</h3>
        ${body}
      </section>
    `;
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
    if (!safeStocks.length) return `<p class="empty-note">No stocks archived for this briefing.</p>`;
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
      <div class="stock-table">
        ${filteredStocks.length ? filteredStocks.map((stock) => {
          const direction = normalizeDirection(stock.direction);
          const riskLevel = normalizeRiskLevel(stock.riskLevel);
          return `
            <div class="stock-row">
              <div class="ticker">${renderTickerLinks(stock.ticker)}</div>
              <div class="stock-detail">
                <div class="stock-meta">
                  <span class="direction-pill ${direction.className}">${escapeHtml(direction.label)}</span>
                  <span class="risk-pill ${riskLevel.className}">${escapeHtml(riskLevel.label)}</span>
                  <span class="tagline">${escapeHtml(stock.type || "watch item")}</span>
                </div>
                <div class="trade-levels">
                  <div>
                    <span>Suggested entry</span>
                    <strong>${escapeHtml(stock.suggestedBuyPrice || stock.entry || "Not specified")}</strong>
                  </div>
                  <div>
                    <span>Profit take</span>
                    <strong>${escapeHtml(stock.suggestedProfitTake || stock.profitTake || "Not specified")}</strong>
                  </div>
                </div>
                <p><strong>Catalyst:</strong> ${escapeHtml(stock.catalyst || "N/A")}</p>
                <p><strong>Why it matters:</strong> ${escapeHtml(stock.why || "N/A")}</p>
                <p><strong>Risk:</strong> ${escapeHtml(stock.risk || "N/A")}</p>
              </div>
            </div>
          `;
        }).join("") : `<p class="empty-note">No stocks match the selected filters.</p>`}
      </div>
    `;
  }

  function renderTickerLinks(tickerValue) {
    const tickers = String(tickerValue || "N/A").split("/");
    return tickers.map((ticker) => {
      const cleanTicker = ticker.trim();
      if (!cleanTicker || cleanTicker === "N/A") return escapeHtml(cleanTicker || "N/A");
      const yahooTicker = cleanTicker.replace(/\./g, "-").replace(/\s+/g, "");
      const href = `https://finance.yahoo.com/quote/${encodeURIComponent(yahooTicker)}`;
      return `<a href="${href}" target="_blank" rel="noreferrer" title="Open ${escapeAttribute(cleanTicker)} on Yahoo Finance">${escapeHtml(cleanTicker)}</a>`;
    }).join("<span>/</span>");
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
          <input id="calcShares" type="number" inputmode="decimal" min="0" step="1" placeholder="10">
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
    const active = stockFilters[group] === value ? "active" : "";
    return `<button class="filter-chip ${active}" type="button" data-filter-group="${escapeAttribute(group)}" data-filter-value="${escapeAttribute(value)}">${escapeHtml(label)}</button>`;
  }

  function attachStockFilterHandlers() {
    els.briefingView.querySelectorAll("[data-filter-group]").forEach((button) => {
      button.addEventListener("click", () => {
        stockFilters[button.dataset.filterGroup] = button.dataset.filterValue;
        renderBriefing();
      });
    });
  }

  function stockMatchesFilters(stock) {
    const direction = normalizeDirection(stock.direction).className;
    const riskLevel = normalizeRiskLevel(stock.riskLevel).value;
    return (stockFilters.direction === "all" || stockFilters.direction === direction)
      && (stockFilters.riskLevel === "all" || stockFilters.riskLevel === riskLevel);
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
    const index = briefings.findIndex((brief) => brief.date === date);
    return index >= 0 ? briefings[index + 1] || null : null;
  }

  function flattenStocks(stocks) {
    return (Array.isArray(stocks) ? stocks : []).flatMap((stock) => {
      const tickers = String(stock.ticker || "N/A").split("/");
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2
    }).format(value);
  }

  function formatPercent(value) {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  }
})();
