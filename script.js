(() => {
  const defaultDuration = 4000;

  function showNotification(message, options = {}) {
    if (typeof message !== "string" || !message.trim()) return;

    const settings = typeof options === "number" ? { duration: options } : options;
    const duration = settings?.duration ?? defaultDuration;
    let stack = document.querySelector(".notification-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "notification-stack";
      stack.setAttribute("role", "region");
      stack.setAttribute("aria-label", "Notifications");
      stack.setAttribute("aria-live", "polite");
      document.body.append(stack);
    }

    const notification = document.createElement("div");
    notification.className = "notification-toast";
    notification.setAttribute("role", "status");
    const messageText = document.createElement("span");
    messageText.textContent = message.trim();
    notification.append(messageText);

    if (settings?.actionLabel && settings?.actionHref) {
      const action = document.createElement("a");
      action.className = "notification-action";
      action.href = settings.actionHref;
      action.textContent = settings.actionLabel;
      notification.append(action);
    }

    stack.append(notification);

    if (duration > 0) {
      window.setTimeout(() => {
        notification.classList.add("is-hiding");
        notification.addEventListener("transitionend", () => notification.remove(), { once: true });
        window.setTimeout(() => notification.remove(), 250);
      }, duration);
    }
  }

  window.showNotification = showNotification;

  const discordButton = document.getElementById("discord-login");
  discordButton?.addEventListener("click", () => {
    showNotification(discordButton.dataset.notification, {
      duration: 10000,
      actionLabel: discordButton.dataset.notificationAction,
      actionHref: discordButton.dataset.notificationLink
    });
  });
})();

(() => {
  const pageName = document.body.dataset.featurePage;
  if (!pageName) return;

  const featureGroups = [
    { name: "General", features: [
      { name: "General Settings", file: "general-settings.html", keywords: "language date format error log roles permissions backups", toggle: false },
      { name: "Commands", file: "commands.html", keywords: "custom slash prefix aliases cooldown", toggle: false },
      { name: "Messages", file: "messages.html", keywords: "templates scheduled welcome automated", toggle: false },
      { name: "Appearance", file: "appearance.html", keywords: "bot profile avatar banner status activity", toggle: false }
    ] },
    { name: "Moderation", features: [
      { name: "Auto moderation", file: "auto-moderation.html", keywords: "automod filters triggers spam links", toggle: true },
      { name: "Moderation", file: "moderation.html", keywords: "cases bans kicks mutes warns reports", toggle: true },
      { name: "Raid protection", file: "raid-protection.html", keywords: "raid join guard security", toggle: true },
      { name: "Roles", file: "roles.html", keywords: "join reaction sticky", toggle: true },
      { name: "Logging", file: "logging.html", keywords: "audit channels events", toggle: true },
      { name: "Backups", file: "backups.html", keywords: "export import restore archive", toggle: true }
    ] },
    { name: "Notifications", features: [
      { name: "Social Notifications", file: "social-notifications.html", keywords: "email google forms youtube", toggle: true },
      { name: "Bump Reminders", file: "bump-reminders.html", keywords: "bump ranking", toggle: true },
      { name: "Welcome Messages", file: "welcome-messages.html", keywords: "join leave welcome", toggle: true }
    ] },
    { name: "Community", features: [
      { name: "Levels", file: "levels.html", keywords: "xp experience ranking rewards", toggle: true },
      { name: "Anonymous messages", file: "anonymous-messages.html", keywords: "anonymous confession", toggle: true },
      { name: "Check-in reminders", file: "check-in-reminders.html", keywords: "check in reminders", toggle: true },
      { name: "Translator", file: "translator.html", keywords: "translation language translate", toggle: true }
    ] },
    { name: "Experimental", features: [
      { name: "AI moderation", file: "ai-moderation.html", keywords: "artificial intelligence", toggle: true },
      { name: "Profile checker", file: "profile-checker.html", keywords: "profile checks", toggle: true }
    ] }
  ];

  const navigation = document.getElementById("feature-navigation");
  const search = document.getElementById("feature-search");
  const homeLink = document.createElement("a");
  homeLink.className = "home-nav";
  homeLink.href = "home.html";
  homeLink.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m2.5 9 7.5-6 7.5 6v8.2a.8.8 0 0 1-.8.8h-4.4v-5.2H8v5.2H3.3a.8.8 0 0 1-.8-.8Z"/></svg><span>Home</span>';
  navigation.append(homeLink);

  const groupsContainer = document.createElement("div");
  groupsContainer.className = "nav-groups";
  navigation.append(groupsContainer);

  function readToggleState(featureName) {
    try {
      return localStorage.getItem(`next-step-feature-${featureName.toLowerCase().replaceAll(" ", "-")}`);
    } catch {
      return null;
    }
  }

  function saveToggleState(featureName, enabled) {
    try {
      localStorage.setItem(`next-step-feature-${featureName.toLowerCase().replaceAll(" ", "-")}`, enabled ? "enabled" : "disabled");
    } catch {
      return;
    }
  }

  function updateFeatureLink(link, enabled) {
    link.setAttribute("aria-disabled", String(!enabled));
    link.tabIndex = enabled ? 0 : -1;
  }

  featureGroups.forEach((group) => {
    const section = document.createElement("section");
    section.className = "nav-group";
    section.dataset.category = group.name;

    const heading = document.createElement("button");
    heading.className = "category-heading";
    heading.type = "button";
    heading.setAttribute("aria-expanded", "true");
    heading.innerHTML = `<span>${group.name}</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>`;
    heading.addEventListener("click", () => {
      const expanded = heading.getAttribute("aria-expanded") === "true";
      heading.setAttribute("aria-expanded", String(!expanded));
      items.hidden = expanded;
    });
    section.append(heading);

    const items = document.createElement("div");
    items.className = "nav-items";

    group.features.forEach((feature) => {
      const row = document.createElement("div");
      row.className = "feature-row";
      const link = document.createElement("a");
      link.className = "feature-link";
      link.href = feature.file;
      link.dataset.search = feature.keywords;
      link.textContent = feature.name;
      if (feature.name === pageName) {
        link.setAttribute("aria-current", "page");
      }
      link.addEventListener("click", (event) => {
        if (link.getAttribute("aria-disabled") === "true") event.preventDefault();
      });
      row.append(link);

      if (feature.toggle) {
        const toggleLabel = document.createElement("label");
        toggleLabel.className = "feature-switch";
        const toggle = document.createElement("input");
        toggle.type = "checkbox";
        toggle.checked = readToggleState(feature.name) !== "disabled";
        toggle.setAttribute("aria-label", `Toggle ${feature.name}`);
        updateFeatureLink(link, toggle.checked);
        toggle.addEventListener("change", () => {
          updateFeatureLink(link, toggle.checked);
          saveToggleState(feature.name, toggle.checked);
        });
        const switchVisual = document.createElement("span");
        toggleLabel.append(toggle, switchVisual);
        row.append(toggleLabel);
      }

      items.append(row);
    });

    section.append(items);
    groupsContainer.append(section);
  });

  const noResults = document.createElement("p");
  noResults.className = "no-results";
  noResults.hidden = true;
  noResults.textContent = "No matching features.";
  navigation.append(noResults);

  search.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    let matchesFound = 0;
    groupsContainer.querySelectorAll(".nav-group").forEach((group) => {
      const categoryMatches = group.dataset.category.toLowerCase().includes(query);
      let matchesInGroup = 0;
      group.querySelectorAll(".feature-row").forEach((row) => {
        const link = row.querySelector(".feature-link");
        const matches = !query || categoryMatches || `${link.textContent} ${link.dataset.search}`.toLowerCase().includes(query);
        row.hidden = !matches;
        if (matches) matchesInGroup += 1;
      });
      group.hidden = matchesInGroup === 0;
      if (query && matchesInGroup > 0) {
        group.querySelector(".nav-items").hidden = false;
        group.querySelector(".category-heading").setAttribute("aria-expanded", "true");
      }
      matchesFound += matchesInGroup;
    });
    noResults.hidden = !query || matchesFound > 0;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
      event.preventDefault();
      search.focus();
    }
  });

  const accountButton = document.getElementById("account-button");
  const accountMenu = document.getElementById("account-menu");
  accountButton.addEventListener("click", () => {
    const isOpen = accountButton.getAttribute("aria-expanded") === "true";
    accountButton.setAttribute("aria-expanded", String(!isOpen));
    accountMenu.hidden = isOpen;
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".account-area")) {
      accountButton.setAttribute("aria-expanded", "false");
      accountMenu.hidden = true;
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      accountButton.setAttribute("aria-expanded", "false");
      accountMenu.hidden = true;
      accountButton.focus();
    }
  });

  document.title = `${pageName} | Next Step`;
})();

(() => {
  if (!document.getElementById("home-view")) return;

  const featureSearch = document.getElementById("feature-search");
  const navGroups = [...document.querySelectorAll(".nav-group")];
  const homeView = document.getElementById("home-view");
  const featureView = document.getElementById("feature-view");
  const breadcrumbCurrent = document.getElementById("breadcrumb-current");
  const accountButton = document.getElementById("account-button");
  const accountMenu = document.getElementById("account-menu");

  const pageDescriptions = {
    "General Settings": "Manage dashboard access, language, date formats, error notifications, and backups.",
    Commands: "Manage the bot’s custom and built-in commands.",
    Messages: "Create and organize templates, scheduled messages, and automated replies.",
    Appearance: "Manage the Next Step bot profile and presence.",
    "Auto moderation": "Review automated moderation rules and protections.",
    Moderation: "Review moderation cases, reports, and punishment settings.",
    "Raid protection": "Manage join protection and raid response settings.",
    Roles: "Manage join roles, reaction roles, and role connections.",
    Logging: "Choose where server and bot events are recorded.",
    Backups: "Create, import, and restore server backups.",
    "Social Notifications": "Manage notifications from connected community services.",
    "Bump Reminders": "Review bump activity and reminder messages.",
    "Welcome Messages": "Manage messages and actions for new and departing members.",
    Levels: "Manage member experience, level rewards, and leaderboards.",
    "Anonymous messages": "Manage anonymous community messages.",
    "Check-in reminders": "Manage scheduled community check-in reminders.",
    Translator: "Manage automatic message translation.",
    "AI moderation": "Review experimental AI-assisted moderation.",
    "Profile checker": "Manage experimental member profile checks.",
    "Error log": "Review recent bot errors and delivery notices."
  };

  function updateDate() {
    const date = document.getElementById("current-date");
    date.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(new Date());
  }

  function updateWelcomeName() {
    const username = new URLSearchParams(window.location.search).get("username");
    if (username) document.getElementById("username").textContent = username;
  }

  function selectView(viewName) {
    const isHome = viewName === "Home";
    homeView.hidden = !isHome;
    featureView.hidden = isHome;
    breadcrumbCurrent.textContent = viewName;

    if (!isHome) {
      document.getElementById("feature-title").textContent = viewName;
      document.getElementById("feature-copy").textContent = pageDescriptions[viewName] || "This feature is part of the Next Step control panel.";
    }

    document.querySelectorAll("[data-view]").forEach((button) => {
      const isSelected = button.dataset.view === viewName;
      button.classList.toggle("active", isSelected && button.classList.contains("home-nav"));
      if (isSelected) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function filterFeatures(query) {
    const normalizedQuery = query.trim().toLowerCase();
    let visibleFeatureCount = 0;

    navGroups.forEach((group) => {
      const categoryName = group.dataset.category.toLowerCase();
      const categoryMatches = normalizedQuery && categoryName.includes(normalizedQuery);
      let visibleInGroup = 0;

      group.querySelectorAll(".feature-row").forEach((row) => {
        const button = row.querySelector(".feature-link");
        const searchableText = `${button.textContent} ${button.dataset.search || ""}`.toLowerCase();
        const matches = !normalizedQuery || categoryMatches || searchableText.includes(normalizedQuery);
        row.hidden = !matches;
        if (matches) visibleInGroup += 1;
      });

      const groupVisible = visibleInGroup > 0;
      group.hidden = !groupVisible;
      const items = group.querySelector(".nav-items");
      const heading = group.querySelector(".category-heading");
      if (normalizedQuery && groupVisible) {
        items.hidden = false;
        heading.setAttribute("aria-expanded", "true");
      }
      visibleFeatureCount += visibleInGroup;
    });

    document.getElementById("no-results").hidden = !normalizedQuery || visibleFeatureCount > 0;
  }

  function setupNavigation() {
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", (event) => {
        if (button.getAttribute("aria-disabled") === "true") {
          event.preventDefault();
          return;
        }
        selectView(button.dataset.view);
      });
    });

    document.querySelectorAll(".category-heading").forEach((heading) => {
      heading.addEventListener("click", () => {
        const expanded = heading.getAttribute("aria-expanded") === "true";
        heading.setAttribute("aria-expanded", String(!expanded));
        heading.nextElementSibling.hidden = expanded;
      });
    });

    featureSearch.addEventListener("input", () => filterFeatures(featureSearch.value));
    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
        event.preventDefault();
        featureSearch.focus();
      }
    });

    document.getElementById("back-home").addEventListener("click", () => selectView("Home"));
    document.getElementById("view-errors").addEventListener("click", () => selectView("Error log"));
  }

  function readFeatureState(storageKey) {
    try {
      return window.localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }

  function saveFeatureState(storageKey, enabled) {
    try {
      window.localStorage.setItem(storageKey, enabled ? "enabled" : "disabled");
    } catch {
      return;
    }
  }

  function setupFeatureToggles() {
    document.querySelectorAll("[data-feature-toggle]").forEach((toggle) => {
      const featureName = toggle.dataset.featureToggle;
      const storageKey = `next-step-feature-${featureName.toLowerCase().replaceAll(" ", "-")}`;
      const savedState = readFeatureState(storageKey);
      if (savedState !== null) toggle.checked = savedState === "enabled";

      const featureButton = toggle.closest(".feature-row").querySelector(".feature-link");
      featureButton.setAttribute("aria-disabled", String(!toggle.checked));
      featureButton.tabIndex = toggle.checked ? 0 : -1;
        toggle.addEventListener("change", (event) => {
          if (event.target.checked) {
            featureButton.setAttribute("aria-disabled", "false");
            featureButton.tabIndex = 0;
          } else {
            featureButton.setAttribute("aria-disabled", "true");
            featureButton.tabIndex = -1;
          }
        saveFeatureState(storageKey, toggle.checked);
      });
    });
  }

  function setupAccountMenu() {
    accountButton.addEventListener("click", () => {
      const isOpen = accountButton.getAttribute("aria-expanded") === "true";
      accountButton.setAttribute("aria-expanded", String(!isOpen));
      accountMenu.hidden = isOpen;
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".account-area")) {
        accountButton.setAttribute("aria-expanded", "false");
        accountMenu.hidden = true;
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        accountButton.setAttribute("aria-expanded", "false");
        accountMenu.hidden = true;
        accountButton.focus();
      }
    });
  }

  const chartSeries = {
    system: [
      { name: "Uptime", color: "#45d18e", phase: 0.1, amplitude: 0.08 },
      { name: "Ping", color: "#62bce8", phase: 1.4, amplitude: 0.22 },
      { name: "CPU", color: "#f0bd62", phase: 2.3, amplitude: 0.28 },
      { name: "Memory", color: "#c6a0df", phase: 3.1, amplitude: 0.16 },
      { name: "Disk", color: "#f08379", phase: 4.2, amplitude: 0.12 }
    ],
    community: [
      { name: "Members", color: "#45d18e", phase: 0.2, amplitude: 0.25 },
      { name: "Joined", color: "#62bce8", phase: 1.1, amplitude: 0.31 },
      { name: "Left", color: "#f08379", phase: 2.9, amplitude: 0.18 },
      { name: "Messages", color: "#f0bd62", phase: 4.5, amplitude: 0.34 }
    ]
  };

  function getChartLabels(range, pointCount) {
    if (range === "24h") return ["00:00", "06:00", "12:00", "18:00", "Now"];
    if (range === "7d") return ["7 days ago", "5 days", "3 days", "Yesterday", "Today"];
    return ["30 days ago", "3 weeks", "2 weeks", "1 week", "Today"].slice(0, Math.min(5, pointCount));
  }

  function drawChart(chartName) {
    const canvas = document.getElementById(`${chartName}-chart`);
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width === 0) return;

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(bounds.width * pixelRatio);
    canvas.height = Math.round(bounds.height * pixelRatio);
    const context = canvas.getContext("2d");
    context.scale(pixelRatio, pixelRatio);

    const width = bounds.width;
    const height = bounds.height;
    const padding = { top: 10, right: 8, bottom: 27, left: 8 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const range = document.querySelector(`[data-chart-range="${chartName}"]`).value;
    const pointCount = range === "24h" ? 12 : range === "7d" ? 14 : 18;
    const labels = getChartLabels(range, pointCount);
    const activeNames = new Set([...document.querySelectorAll(`[data-chart="${chartName}"]:checked`)].map((input) => input.dataset.series));

    context.clearRect(0, 0, width, height);
    context.font = "10px DM Sans, Segoe UI, sans-serif";
    context.textBaseline = "middle";

    for (let gridIndex = 0; gridIndex < 4; gridIndex += 1) {
      const y = padding.top + (chartHeight * gridIndex) / 3;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.strokeStyle = "#343b36";
      context.lineWidth = 1;
      context.stroke();
    }

    context.fillStyle = "#9da69f";
    labels.forEach((label, labelIndex) => {
      const x = padding.left + (chartWidth * labelIndex) / (labels.length - 1);
      context.textAlign = labelIndex === 0 ? "left" : labelIndex === labels.length - 1 ? "right" : "center";
      context.fillText(label, x, height - 11);
    });

    chartSeries[chartName].filter((series) => activeNames.has(series.name)).forEach((series) => {
      context.beginPath();
      for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
        const wave = Math.sin(pointIndex * 0.71 + series.phase) * series.amplitude;
        const detail = Math.sin(pointIndex * 1.83 + series.phase * 2) * series.amplitude * 0.28;
        const value = Math.max(0.12, Math.min(0.88, 0.51 + wave + detail));
        const x = padding.left + (chartWidth * pointIndex) / (pointCount - 1);
        const y = padding.top + chartHeight * (1 - value);
        if (pointIndex === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = series.color;
      context.lineWidth = 2;
      context.lineJoin = "round";
      context.lineCap = "round";
      context.stroke();
    });
  }

  function setupCharts() {
    document.querySelectorAll("[data-chart-range], [data-chart]").forEach((control) => {
      control.addEventListener("change", () => drawChart(control.dataset.chart || control.dataset.chartRange));
    });
    window.addEventListener("resize", () => {
      drawChart("system");
      drawChart("community");
    });
    drawChart("system");
    drawChart("community");
  }

  updateDate();
  updateWelcomeName();
  setupNavigation();
  setupFeatureToggles();
  setupAccountMenu();
  setupCharts();

  const requestedView = new URLSearchParams(window.location.search).get("view");
  const featureViews = new Set([...document.querySelectorAll(".feature-link")].map((link) => link.dataset.view));
  if (requestedView && featureViews.has(requestedView)) selectView(requestedView);
})();
