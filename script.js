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
  const sidebarHeading = document.querySelector(".sidebar-heading");
  const sidebarEyebrow = sidebarHeading.querySelector(":scope > .eyebrow");
  const sidebarTitle = sidebarHeading.querySelector(":scope > h2");
  if (sidebarEyebrow || sidebarTitle) {
    const headingCopy = document.createElement("div");
    if (sidebarEyebrow) headingCopy.append(sidebarEyebrow);
    if (sidebarTitle) headingCopy.append(sidebarTitle);
    sidebarHeading.prepend(headingCopy);
  }
  const homeLink = document.createElement("a");
  homeLink.className = "home-nav";
  homeLink.href = "home.html";
  homeLink.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m2.5 9 7.5-6 7.5 6v8.2a.8.8 0 0 1-.8.8h-4.4v-5.2H8v5.2H3.3a.8.8 0 0 1-.8-.8Z"/></svg><span>Home</span>';
  sidebarHeading.append(homeLink);

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
      { name: "CPU", axis: "left", color: "#f0bd62", phase: 2.3, amplitude: 0.28 },
      { name: "Memory", axis: "left", color: "#c6a0df", phase: 3.1, amplitude: 0.16 },
      { name: "Disk", axis: "left", color: "#f08379", phase: 4.2, amplitude: 0.12 },
      { name: "Ping", axis: "right", color: "#62bce8", phase: 1.4, amplitude: 0.22 },
      { name: "Uptime", axis: "left", color: "#45d18e", phase: 0.1, amplitude: 0.08 }
    ],
    community: [
      { name: "Members", axis: "right", color: "#45d18e", phase: 0.2, amplitude: 0.25 },
      { name: "Joined", axis: "right", color: "#62bce8", phase: 1.1, amplitude: 0.31 },
      { name: "Left", axis: "right", color: "#f08379", phase: 2.9, amplitude: 0.18 },
      { name: "Messages", axis: "right", color: "#f0bd62", phase: 4.5, amplitude: 0.34 }
    ]
  };

  const chartStates = {
    system: { domains: { left: null, right: null }, opacity: {} },
    community: { domains: { left: null, right: null }, opacity: {} }
  };
  const chartFrames = { system: 0, community: 0 };

  function getChartLabels(range, pointCount) {
    if (range === "24h") return ["00:00", "06:00", "12:00", "18:00", "Now"];
    if (range === "7d") return ["7 days ago", "5 days", "3 days", "Yesterday", "Today"];
    return ["30 days ago", "3 weeks", "2 weeks", "1 week", "Today"].slice(0, Math.min(5, pointCount));
  }

  function drawChart(chartName, animate = false) {
    const canvas = document.getElementById(`${chartName}-chart`);
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width === 0) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(bounds.width * pixelRatio);
    const pixelHeight = Math.round(bounds.height * pixelRatio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const context = canvas.getContext("2d");
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const width = bounds.width;
    const height = bounds.height;
    const padding = { top: 10, right: 40, bottom: 27, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const range = document.querySelector(`[data-chart-range="${chartName}"]`).value;
    const pointCount = range === "24h" ? 12 : range === "7d" ? 14 : 18;
    const labels = getChartLabels(range, pointCount);
    const activeNames = new Set([...document.querySelectorAll(`[data-chart="${chartName}"]:checked`)].map((input) => input.dataset.series));
    const data = chartSeries[chartName].map((series) => ({
      ...series,
      values: Array.from({ length: pointCount }, (_, pointIndex) => {
        const wave = Math.sin(pointIndex * 0.71 + series.phase) * series.amplitude * 100;
        const detail = Math.sin(pointIndex * 1.83 + series.phase * 2) * series.amplitude * 28;
        return Math.max(0, Math.min(100, 51 + wave + detail));
      })
    }));
    const targetDomains = { left: null, right: null };
    ["left", "right"].forEach((axis) => {
      const visibleValues = data
        .filter((series) => series.axis === axis && activeNames.has(series.name))
        .flatMap((series) => series.values);
      let min = 0;
      let max = 100;

      if (visibleValues.length > 0) {
        const dataMin = Math.min(...visibleValues);
        const dataMax = Math.max(...visibleValues);
        const paddingValue = Math.max(4, (dataMax - dataMin) * 0.16);
        min = Math.max(0, Math.floor((dataMin - paddingValue) / 5) * 5);
        max = Math.min(100, Math.ceil((dataMax + paddingValue) / 5) * 5);

        if (max - min < 20) {
          const middle = (max + min) / 2;
          min = Math.max(0, Math.floor((middle - 10) / 5) * 5);
          max = Math.min(100, min + 20);
          min = Math.max(0, max - 20);
        }
      }

      targetDomains[axis] = { min, max };
    });

    const state = chartStates[chartName];
    const fromDomains = {
      left: state.domains.left || targetDomains.left,
      right: state.domains.right || targetDomains.right
    };
    const fromOpacity = { ...state.opacity };
    const toOpacity = Object.fromEntries(data.map((series) => [series.name, activeNames.has(series.name) ? 1 : 0]));
    const shouldAnimate = animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = shouldAnimate ? 260 : 0;
    const startTime = performance.now();

    if (chartFrames[chartName]) cancelAnimationFrame(chartFrames[chartName]);

    function renderFrame(now) {
      const progress = duration === 0 ? 1 : Math.min(1, (now - startTime) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const domains = Object.fromEntries(["left", "right"].map((axis) => [axis, {
        min: fromDomains[axis].min + (targetDomains[axis].min - fromDomains[axis].min) * eased,
        max: fromDomains[axis].max + (targetDomains[axis].max - fromDomains[axis].max) * eased
      }]));

      context.clearRect(0, 0, width, height);
      context.font = "10px DM Sans, Segoe UI, sans-serif";
      context.textBaseline = "middle";
      context.strokeStyle = "#343b36";
      context.lineWidth = 1;
      context.fillStyle = "#9da69f";
      for (let gridIndex = 0; gridIndex <= 4; gridIndex += 1) {
        const fraction = gridIndex / 4;
        const y = padding.top + chartHeight * fraction;
        const leftValue = domains.left.max - (domains.left.max - domains.left.min) * fraction;
        const rightValue = domains.right.max - (domains.right.max - domains.right.min) * fraction;
        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.stroke();
        context.textAlign = "right";
        context.fillText(`${Math.round(leftValue)}`, padding.left - 8, y);
        context.textAlign = "left";
        context.fillText(`${Math.round(rightValue)}`, width - padding.right + 8, y);
      }

      context.textAlign = "left";
      labels.forEach((label, labelIndex) => {
        const x = padding.left + (chartWidth * labelIndex) / (labels.length - 1);
        context.textAlign = labelIndex === 0 ? "left" : labelIndex === labels.length - 1 ? "right" : "center";
        context.fillText(label, x, height - 11);
      });

      data.forEach((series) => {
        const initialOpacity = fromOpacity[series.name] ?? toOpacity[series.name];
        const opacity = initialOpacity + (toOpacity[series.name] - initialOpacity) * eased;
        if (opacity <= 0.01) return;

        context.beginPath();
        const domain = domains[series.axis];
        const domainSpan = Math.max(1, domain.max - domain.min);
        series.values.forEach((value, pointIndex) => {
          const x = padding.left + (chartWidth * pointIndex) / (pointCount - 1);
          const y = padding.top + chartHeight * (1 - (value - domain.min) / domainSpan);
          if (pointIndex === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.globalAlpha = opacity;
        context.strokeStyle = series.color;
        context.lineWidth = 2;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.stroke();
        context.globalAlpha = 1;
      });

      state.domains = domains;
      state.opacity = Object.fromEntries(data.map((series) => {
        const initialOpacity = fromOpacity[series.name] ?? toOpacity[series.name];
        return [series.name, initialOpacity + (toOpacity[series.name] - initialOpacity) * eased];
      }));

      if (progress < 1) chartFrames[chartName] = requestAnimationFrame(renderFrame);
      else chartFrames[chartName] = 0;
    }

    if (duration === 0) renderFrame(startTime);
    else chartFrames[chartName] = requestAnimationFrame(renderFrame);
  }

  function setupCharts() {
    document.querySelectorAll("[data-chart-range], [data-chart]").forEach((control) => {
      control.addEventListener("change", () => drawChart(control.dataset.chart || control.dataset.chartRange, true));
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

(() => {
  if (document.body.dataset.featurePage !== "General Settings") return;

  const storagePrefix = "next-step-general-";
  const readStored = (key, fallback) => {
    try {
      const value = localStorage.getItem(`${storagePrefix}${key}`);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  };
  const writeStored = (key, value) => {
    try {
      localStorage.setItem(`${storagePrefix}${key}`, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };
  const notify = (message) => window.showNotification?.(message, 3500);
  const languageSelect = document.getElementById("language-select");
  const customLanguages = readStored("custom-languages", []);
  const customTranslations = readStored("custom-translations", {});
  const translationKeys = ["General Settings", "Language", "Date format", "Error log", "Manager roles", "Advanced dashboard permissions", "Backups"];
  const dutchStrings = {
    "General Settings": "Algemene instellingen",
    Language: "Taal",
    "Date format": "Datumformaat",
    "Error log": "Foutenlogboek",
    "Manager roles": "Beheerdersrollen",
    "Advanced dashboard permissions": "Geavanceerde dashboardrechten",
    Backups: "Back-ups"
  };

  function applyLanguage() {
    const language = languageSelect.value;
    const translations = language === "nl" ? dutchStrings : language.startsWith("custom:") ? customTranslations[language.slice(7)] || {} : {};
    document.documentElement.lang = language === "nl" ? "nl" : language.startsWith("custom:") ? language.slice(7) : "en";
    document.querySelectorAll("[data-i18n-key]").forEach((element) => {
      const key = element.dataset.i18nKey;
      element.textContent = translations[key] || key;
    });
    if (language.startsWith("custom:")) {
      document.getElementById("translation-editor").hidden = false;
      renderTranslationEditor(language.slice(7));
    } else {
      document.getElementById("translation-editor").hidden = true;
    }
  }

  function renderLanguages(selectedValue) {
    languageSelect.querySelectorAll("option[data-custom-language]").forEach((option) => option.remove());
    customLanguages.forEach((language) => {
      const option = document.createElement("option");
      option.value = `custom:${language.code}`;
      option.textContent = language.name;
      option.dataset.customLanguage = "true";
      languageSelect.append(option);
    });
    languageSelect.value = selectedValue;
    if (!languageSelect.value) languageSelect.value = "en";
  }

  function renderTranslationEditor(code) {
    const rows = document.getElementById("translation-rows");
    rows.replaceChildren();
    translationKeys.forEach((key) => {
      const row = document.createElement("label");
      row.className = "gs-translation-row";
      const source = document.createElement("span");
      source.textContent = key;
      const input = document.createElement("input");
      input.type = "text";
      input.dataset.translationKey = key;
      input.value = customTranslations[code]?.[key] || "";
      input.placeholder = key;
      row.append(source, input);
      rows.append(row);
    });
  }

  const storedLanguage = readStored("language", "en");
  renderLanguages(storedLanguage);
  applyLanguage();
  languageSelect.addEventListener("change", () => {
    writeStored("language", languageSelect.value);
    applyLanguage();
  });

  const translationDialog = document.getElementById("translation-dialog");
  document.getElementById("add-translation").addEventListener("click", () => {
    document.getElementById("translation-import-status").textContent = "";
    translationDialog.showModal();
  });
  document.getElementById("download-language-template").addEventListener("click", () => {
    const template = {
      name: "New language",
      code: "xx",
      translations: Object.fromEntries(translationKeys.map((key) => [key, ""]))
    };
    const blobUrl = URL.createObjectURL(new Blob([`${JSON.stringify(template, null, 2)}\n`], { type: "application/json" }));
    const download = document.createElement("a");
    download.href = blobUrl;
    download.download = "next-step-language-template.json";
    download.click();
    URL.revokeObjectURL(blobUrl);
  });
  document.getElementById("import-language-json").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const status = document.getElementById("translation-import-status");
    try {
      const imported = JSON.parse(await file.text());
      const name = typeof imported.name === "string" ? imported.name.trim() : "";
      const code = typeof imported.code === "string" ? imported.code.trim().toLowerCase() : "";
      if (!name || !/^[a-z0-9-]{2,12}$/.test(code) || ["en", "nl"].includes(code) || !imported.translations || typeof imported.translations !== "object" || Array.isArray(imported.translations)) {
        throw new Error("Invalid language file");
      }
      const existing = customLanguages.find((language) => language.code === code);
      const translations = Object.fromEntries(translationKeys.map((key) => [
        key,
        typeof imported.translations[key] === "string" ? imported.translations[key].trim() : ""
      ]));
      if (existing) existing.name = name;
      else customLanguages.push({ name, code });
      customTranslations[code] = translations;
      writeStored("custom-languages", customLanguages);
      writeStored("custom-translations", customTranslations);
      renderLanguages(languageSelect.value);
      status.textContent = `${name} added to the language list. Select it from Dashboard language to install it.`;
      notify(`${name} added to the language list.`);
    } catch {
      status.textContent = "Invalid language JSON. Download the template and keep its name, code, and translations fields.";
      notify("Could not import language JSON.");
    } finally {
      event.target.value = "";
    }
  });
  document.getElementById("save-translation").addEventListener("click", () => {
    const code = languageSelect.value.slice(7);
    customTranslations[code] = Object.fromEntries([...document.querySelectorAll("[data-translation-key]")].map((input) => [input.dataset.translationKey, input.value.trim()]));
    writeStored("custom-translations", customTranslations);
    applyLanguage();
    notify("Translation saved in this browser.");
  });

  const dateFormatInput = document.getElementById("date-format");
  const dateFormatPreview = document.getElementById("date-format-preview");
  dateFormatInput.value = readStored("date-format", "DD/MM/YYYY - HH:mm:ss");
  function updateDatePreview() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    const tokens = {
      DD: pad(now.getDate()),
      MM: pad(now.getMonth() + 1),
      YYYY: String(now.getFullYear()),
      HH: pad(now.getHours()),
      mm: pad(now.getMinutes()),
      ss: pad(now.getSeconds())
    };
    dateFormatPreview.textContent = dateFormatInput.value.replace(/YYYY|DD|MM|HH|mm|ss/g, (token) => tokens[token]);
  }
  dateFormatInput.addEventListener("input", () => {
    writeStored("date-format", dateFormatInput.value);
    updateDatePreview();
  });
  updateDatePreview();
  window.setInterval(updateDatePreview, 1000);

  const managerRoleList = document.getElementById("manager-role-list");
  const managerRoles = readStored("manager-roles", []);
  function renderManagerRoles() {
    managerRoleList.replaceChildren();
    if (managerRoles.length === 0) {
      const empty = document.createElement("p");
      empty.className = "gs-empty-note";
      empty.textContent = "No manager roles added.";
      managerRoleList.append(empty);
      return;
    }
    managerRoles.forEach((name, index) => {
      const chip = document.createElement("span");
      chip.className = "gs-chip";
      const label = document.createElement("span");
      label.textContent = name;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove ${name}`);
      remove.textContent = "x";
      remove.addEventListener("click", () => {
        managerRoles.splice(index, 1);
        writeStored("manager-roles", managerRoles);
        renderManagerRoles();
      });
      chip.append(label, remove);
      managerRoleList.append(chip);
    });
  }
  renderManagerRoles();
  document.getElementById("manager-role-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("manager-role-input");
    const name = input.value.trim();
    if (!name || managerRoles.some((role) => role.toLowerCase() === name.toLowerCase())) return;
    managerRoles.push(name);
    writeStored("manager-roles", managerRoles);
    input.value = "";
    renderManagerRoles();
  });

  const screens = {
    overview: document.getElementById("settings-overview"),
    "error-log": document.getElementById("error-log-screen"),
    "advanced-permissions": document.getElementById("advanced-permissions-screen"),
    backups: document.getElementById("backups-screen")
  };
  function showScreen(name) {
    Object.entries(screens).forEach(([screenName, element]) => { element.hidden = screenName !== name; });
    document.getElementById("breadcrumb-current").textContent = name === "overview" ? "General Settings" : name === "advanced-permissions" ? "Advanced dashboard permissions" : name === "error-log" ? "Error log" : "Backups";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.querySelectorAll("[data-open-settings]").forEach((button) => button.addEventListener("click", () => showScreen(button.dataset.openSettings)));
  document.querySelectorAll("[data-back-settings]").forEach((button) => button.addEventListener("click", () => showScreen("overview")));

  const errorTypes = ["Cannot send message to this user", "Unknown message", "Unknown member"];
  const errorPreferences = readStored("error-types", Object.fromEntries(errorTypes.map((type) => [type, true])));
  const errorCheckboxes = [...document.querySelectorAll("[data-error-type]")];
  errorCheckboxes.forEach((input) => { input.checked = errorPreferences[input.dataset.errorType] !== false; });
  const errorSettingsDialog = document.getElementById("error-settings-dialog");
  document.getElementById("configure-errors").addEventListener("click", () => errorSettingsDialog.showModal());
  document.getElementById("save-error-settings").addEventListener("click", (event) => {
    event.preventDefault();
    errorCheckboxes.forEach((input) => { errorPreferences[input.dataset.errorType] = input.checked; });
    writeStored("error-types", errorPreferences);
    renderErrors();
    errorSettingsDialog.close();
  });

  const initialErrors = [
    { type: "Cannot send message to this user", title: "Message delivery delayed", detail: "Welcome message queue took longer than expected.", time: "09:42" },
    { type: "Unknown member", title: "Unknown member reference", detail: "A moderation action referenced a member who left the server.", time: "08:16" }
  ];
  let errors = readStored("error-inbox", null);
  if (errors === null) errors = initialErrors;
  const errorInbox = document.getElementById("error-inbox");
  const errorPreview = document.getElementById("error-preview");
  function renderErrors() {
    errorInbox.replaceChildren();
    errorPreview.replaceChildren();
    const visibleErrors = errors.filter((error) => errorPreferences[error.type] !== false);
    document.getElementById("error-count").textContent = `${visibleErrors.length} notification${visibleErrors.length === 1 ? "" : "s"}`;
    if (visibleErrors.length === 0) {
      const empty = document.createElement("p");
      empty.className = "gs-inbox-empty";
      empty.textContent = "No matching notifications in the inbox.";
      errorInbox.append(empty);
      const previewEmpty = document.createElement("p");
      previewEmpty.className = "gs-empty-note";
      previewEmpty.textContent = "No recent errors.";
      errorPreview.append(previewEmpty);
      return;
    }
    visibleErrors.slice(0, 2).forEach((error) => {
      const row = document.createElement("div");
      row.className = "gs-preview-error-row";
      const marker = document.createElement("span");
      marker.className = "gs-error-icon";
      marker.setAttribute("aria-hidden", "true");
      marker.textContent = "!";
      const copy = document.createElement("div");
      copy.className = "gs-preview-error-copy";
      const title = document.createElement("strong");
      title.textContent = error.title;
      const detail = document.createElement("span");
      detail.textContent = error.detail;
      copy.append(title, detail);
      const time = document.createElement("time");
      time.textContent = `${error.time} Preview`;
      row.append(marker, copy, time);
      errorPreview.append(row);
    });
    visibleErrors.forEach((error) => {
      const row = document.createElement("article");
      row.className = "gs-inbox-row";
      const icon = document.createElement("span");
      icon.className = "gs-error-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "!";
      const copy = document.createElement("div");
      copy.className = "gs-error-copy";
      const title = document.createElement("strong");
      title.textContent = error.title;
      const detail = document.createElement("span");
      detail.textContent = `${error.type} - ${error.detail}`;
      copy.append(title, detail);
      const time = document.createElement("time");
      time.className = "gs-error-time";
      time.textContent = `${error.time} - Preview`;
      row.append(icon, copy, time);
      errorInbox.append(row);
    });
  }
  renderErrors();
  document.getElementById("clear-errors").addEventListener("click", () => {
    errors = [];
    writeStored("error-inbox", errors);
    renderErrors();
  });

  const permissionGroups = [
    { name: "General", permissions: ["General Settings", "Commands", "Messages", "Appearance"] },
    { name: "Moderation", permissions: ["Auto moderation", "Moderation", "Raid protection", "Roles", "Logging"] },
    { name: "Notifications", permissions: ["Social Notifications", "Bump Reminders", "Welcome Messages"] },
    { name: "Community", permissions: ["Levels", "Anonymous messages", "Check-in reminders", "Translator"] },
    { name: "Experimental", permissions: ["AI moderation", "Profile checker"] }
  ];
  const permissionSubjects = readStored("permission-subjects", []);
  const permissionGrants = readStored("permission-grants", {});
  let activeSubjectId = null;
  const permissionSubjectList = document.getElementById("permission-subject-list");
  const permissionEditor = document.getElementById("permission-editor");
  const permissionGroupsElement = document.getElementById("permission-groups");

  function savePermissionGrants() { writeStored("permission-grants", permissionGrants); }
  function renderPermissionGroups() {
    permissionGroupsElement.replaceChildren();
    const subjectGrants = permissionGrants[activeSubjectId] || {};
    permissionGroups.forEach((group, groupIndex) => {
      const category = document.createElement("section");
      category.className = "gs-permission-category";
      const heading = document.createElement("div");
      heading.className = "gs-permission-category-heading";
      const title = document.createElement("strong");
      title.textContent = group.name;
      const categoryLabel = document.createElement("label");
      categoryLabel.className = "gs-permission-toggle";
      const categoryToggle = document.createElement("input");
      categoryToggle.type = "checkbox";
      const allChecked = group.permissions.every((permission) => subjectGrants[permission] === true);
      const someChecked = group.permissions.some((permission) => subjectGrants[permission] === true);
      categoryToggle.checked = allChecked;
      categoryToggle.indeterminate = someChecked && !allChecked;
      categoryToggle.setAttribute("aria-label", `Toggle all ${group.name} permissions`);
      categoryToggle.addEventListener("change", () => {
        group.permissions.forEach((permission) => { subjectGrants[permission] = categoryToggle.checked; });
        permissionGrants[activeSubjectId] = subjectGrants;
        savePermissionGrants();
        renderPermissionGroups();
      });
      categoryLabel.append(categoryToggle, document.createTextNode("All"));
      heading.append(title, categoryLabel);
      const options = document.createElement("div");
      options.className = "gs-permission-options";
      group.permissions.forEach((permission, permissionIndex) => {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = subjectGrants[permission] === true;
        input.dataset.permissionIndex = String(permissionIndex);
        input.addEventListener("change", () => {
          subjectGrants[permission] = input.checked;
          permissionGrants[activeSubjectId] = subjectGrants;
          savePermissionGrants();
          renderPermissionGroups();
        });
        label.append(input, document.createTextNode(permission));
        options.append(label);
      });
      category.append(heading, options);
      permissionGroupsElement.append(category);
    });
  }

  function renderPermissionSubjects() {
    permissionSubjectList.replaceChildren();
    if (permissionSubjects.length === 0) {
      const empty = document.createElement("p");
      empty.className = "gs-empty-note";
      empty.textContent = "Add a role or user to configure permissions.";
      permissionSubjectList.append(empty);
      permissionEditor.hidden = true;
      return;
    }
    permissionSubjects.forEach((subject) => {
      const wrapper = document.createElement("span");
      wrapper.className = "gs-subject-entry";
      const select = document.createElement("button");
      select.type = "button";
      select.className = "gs-subject-button";
      select.setAttribute("aria-pressed", String(subject.id === activeSubjectId));
      select.textContent = `${subject.type}: ${subject.name}`;
      select.addEventListener("click", () => {
        activeSubjectId = subject.id;
        document.getElementById("permission-editor-title").textContent = `${subject.name} permissions`;
        permissionEditor.hidden = false;
        renderPermissionSubjects();
        renderPermissionGroups();
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "gs-subject-remove";
      remove.setAttribute("aria-label", `Remove ${subject.type} ${subject.name}`);
      remove.textContent = "x";
      remove.addEventListener("click", () => {
        const index = permissionSubjects.findIndex((item) => item.id === subject.id);
        if (index >= 0) permissionSubjects.splice(index, 1);
        delete permissionGrants[subject.id];
        writeStored("permission-subjects", permissionSubjects);
        savePermissionGrants();
        if (activeSubjectId === subject.id) activeSubjectId = permissionSubjects[0]?.id || null;
        renderPermissionSubjects();
        if (activeSubjectId) {
          permissionEditor.hidden = false;
          document.getElementById("permission-editor-title").textContent = `${permissionSubjects.find((item) => item.id === activeSubjectId).name} permissions`;
          renderPermissionGroups();
        }
      });
      wrapper.append(select, remove);
      permissionSubjectList.append(wrapper);
    });
  }

  renderPermissionSubjects();
  document.getElementById("permission-subject-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const nameInput = document.getElementById("permission-subject-name");
    const name = nameInput.value.trim();
    const type = document.getElementById("permission-subject-type").value;
    if (!name || permissionSubjects.some((subject) => subject.type === type && subject.name.toLowerCase() === name.toLowerCase())) return;
    const subject = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, name };
    permissionSubjects.push(subject);
    activeSubjectId = subject.id;
    writeStored("permission-subjects", permissionSubjects);
    permissionEditor.hidden = false;
    permissionGrants[activeSubjectId] = {};
    savePermissionGrants();
    document.getElementById("permission-editor-title").textContent = `${subject.name} permissions`;
    nameInput.value = "";
    renderPermissionSubjects();
    renderPermissionGroups();
  });

  const backupInterval = document.getElementById("backup-interval");
  const backupParts = [...document.querySelectorAll("[data-backup-part]")];
  let backupPreferences = readStored("backup-preferences", { interval: "24h", parts: { bot: true, server: true, channels: true, roles: true } });
  backupInterval.value = backupPreferences.interval;
  backupParts.forEach((input) => {
    input.checked = backupPreferences.parts[input.dataset.backupPart] !== false;
    input.addEventListener("change", saveBackupPreferences);
  });
  backupInterval.addEventListener("change", saveBackupPreferences);
  function saveBackupPreferences() {
    backupPreferences = {
      interval: backupInterval.value,
      parts: Object.fromEntries(backupParts.map((input) => [input.dataset.backupPart, input.checked]))
    };
    writeStored("backup-preferences", backupPreferences);
  }

  let backupHistory = readStored("backup-history", []);
  const backupHistoryElement = document.getElementById("backup-history");
  function renderBackupHistory() {
    backupHistoryElement.replaceChildren();
    if (backupHistory.length === 0) {
      const empty = document.createElement("p");
      empty.className = "gs-empty-note";
      empty.textContent = "No local backups yet.";
      backupHistoryElement.append(empty);
      return;
    }
    backupHistory.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "gs-backup-row";
      const name = document.createElement("span");
      name.textContent = entry.name;
      const time = document.createElement("time");
      time.dateTime = entry.createdAt;
      time.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt));
      const exportButton = document.createElement("button");
      exportButton.type = "button";
      exportButton.textContent = "Export";
      exportButton.addEventListener("click", () => downloadBackup(entry.backup, `${entry.name}.json`));
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => {
        backupHistory = backupHistory.filter((item) => item.id !== entry.id);
        writeStored("backup-history", backupHistory);
        renderBackupHistory();
      });
      row.append(name, time, exportButton, removeButton);
      backupHistoryElement.append(row);
    });
  }
  function makeBackup() {
    return {
      app: "Next Step Dashboard",
      version: 1,
      createdAt: new Date().toISOString(),
      settings: {
        language: languageSelect.value,
        customLanguages,
        customTranslations,
        dateFormat: dateFormatInput.value,
        managerRoles,
        errorTypes: errorPreferences,
        permissionSubjects,
        permissionGrants,
        backupPreferences
      }
    };
  }
  function downloadBackup(backup, filename) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
  function saveBackupToHistory(backup, name) {
    const entry = { id: `${Date.now()}`, name, createdAt: backup.createdAt, backup };
    backupHistory.unshift(entry);
    writeStored("backup-history", backupHistory);
    renderBackupHistory();
  }
  renderBackupHistory();
  document.getElementById("create-backup").addEventListener("click", () => {
    const backup = makeBackup();
    saveBackupToHistory(backup, `Next Step ${new Date(backup.createdAt).toLocaleString()}`);
    notify("Local settings backup created.");
  });
  document.getElementById("export-backup").addEventListener("click", () => {
    const backup = makeBackup();
    downloadBackup(backup, `next-step-backup-${backup.createdAt.slice(0, 10)}.json`);
  });
  document.getElementById("import-backup").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (backup.app !== "Next Step Dashboard" || !backup.settings || typeof backup.settings !== "object") throw new Error("Invalid backup file");
      const settingKeys = {
        language: "language",
        customLanguages: "custom-languages",
        customTranslations: "custom-translations",
        dateFormat: "date-format",
        managerRoles: "manager-roles",
        errorTypes: "error-types",
        permissionSubjects: "permission-subjects",
        permissionGrants: "permission-grants",
        backupPreferences: "backup-preferences"
      };
      Object.entries(settingKeys).forEach(([field, key]) => {
        if (field in backup.settings) writeStored(key, backup.settings[field]);
      });
      saveBackupToHistory(backup, file.name.replace(/\.json$/i, ""));
      window.location.reload();
    } catch {
      notify("Could not read that backup JSON file.");
      event.target.value = "";
    }
  });
})();
