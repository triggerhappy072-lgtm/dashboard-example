(() => {
  const STORAGE_KEY = "next-step-roles-v1";
  const HASHES = {
    join: "#join-roles",
    reaction: "#reaction-roles",
    connections: "#role-connections",
    sticky: "#sticky-roles"
  };

  const defaultState = {
    activeTab: "join",
    join: {
      defaultDelay: 0,
      waitScreening: true,
      items: []
    },
    reaction: [],
    connections: [],
    sticky: {
      enabled: true,
      items: []
    }
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function cloneDefault() {
    return JSON.parse(JSON.stringify(defaultState));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function makeId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || typeof parsed !== "object") return cloneDefault();
      return {
        activeTab: parsed.activeTab || "join",
        join: {
          defaultDelay: Math.max(0, Number(parsed.join && parsed.join.defaultDelay || 0)),
          waitScreening: !(parsed.join && parsed.join.waitScreening === false),
          items: Array.isArray(parsed.join && parsed.join.items) ? parsed.join.items : []
        },
        reaction: Array.isArray(parsed.reaction) ? parsed.reaction : [],
        connections: Array.isArray(parsed.connections) ? parsed.connections : [],
        sticky: {
          enabled: !(parsed.sticky && parsed.sticky.enabled === false),
          items: Array.isArray(parsed.sticky && parsed.sticky.items) ? parsed.sticky.items : []
        }
      };
    } catch {
      return cloneDefault();
    }
  }

  let state = loadState();
  let toastTimer = 0;
  let lastModalOpener = null;

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      return;
    }
  }

  function showToast(message) {
    const toast = $("#roles-toast");
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 2400);
  }

  function pill(label, tone) {
    return '<span class="roles-pill' + (tone ? " " + tone : "") + '">' + escapeHtml(label) + "</span>";
  }

  function roleChip(role) {
    return '<span class="roles-role-chip">' + escapeHtml(role) + "</span>";
  }

  function emptyState(icon, title, copy) {
    return '<div class="roles-empty-state"><div>' +
      '<span class="roles-empty-icon" aria-hidden="true">' + escapeHtml(icon) + "</span>" +
      "<strong>" + escapeHtml(title) + "</strong>" +
      "<p>" + escapeHtml(copy) + "</p>" +
      "</div></div>";
  }

  function delayLabel(value) {
    const seconds = Math.max(0, Number(value || 0));
    if (seconds === 0) return "Immediately";
    if (seconds < 60) return seconds + "s delay";
    if (seconds < 3600) return Math.round(seconds / 60) + "m delay";
    if (seconds < 86400) return Math.round(seconds / 3600) + "h delay";
    return Math.round(seconds / 86400) + "d delay";
  }

  function modalActions(submitLabel) {
    return '<div class="roles-modal-actions">' +
      '<button class="roles-secondary" type="button" data-modal-cancel>Cancel</button>' +
      '<button class="roles-primary" type="submit">' + escapeHtml(submitLabel || "Save") + "</button>" +
      "</div>";
  }

  function openModal(html, opener) {
    const overlay = $("#roles-modal-overlay");
    const content = $("#roles-modal-content");
    lastModalOpener = opener || document.activeElement;
    content.innerHTML = html;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => {
      const first = $("input, select, textarea, button:not(.roles-modal-close)", content);
      if (first) first.focus();
    }, 0);
  }

  function closeModal() {
    const overlay = $("#roles-modal-overlay");
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    $("#roles-modal-content").innerHTML = "";
    document.body.style.overflow = "";
    if (lastModalOpener && typeof lastModalOpener.focus === "function") lastModalOpener.focus();
    lastModalOpener = null;
  }

  function setActiveTab(tab, updateHash) {
    if (!HASHES[tab]) tab = "join";
    state.activeTab = tab;
    saveState();

    $$("[data-role-tab]").forEach((button) => {
      const active = button.dataset.roleTab === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });

    $$("[data-role-view]").forEach((view) => {
      const active = view.dataset.roleView === tab;
      view.classList.toggle("active", active);
      view.hidden = !active;
    });

    if (updateHash !== false && history.replaceState) {
      history.replaceState(null, "", HASHES[tab]);
    }
  }

  function tabFromHash() {
    const hash = window.location.hash.toLowerCase();
    const match = Object.keys(HASHES).find((key) => HASHES[key] === hash);
    return match || state.activeTab || "join";
  }

  function renderJoin() {
    const items = state.join.items;
    $("#join-default-delay").value = String(state.join.defaultDelay);
    $("#join-wait-screening").checked = state.join.waitScreening;
    $("#join-count").textContent = items.length + " join role" + (items.length === 1 ? "" : "s");

    const list = $("#join-list");
    if (!items.length) {
      list.innerHTML = emptyState("+", "No join roles configured", "Add a role to automatically assign it when a member joins your server.");
      return;
    }

    list.innerHTML = items.map((item, index) => {
      let audience = "All members";
      if (item.audience === "bots") audience = "Bots only";
      if (item.audience === "user") audience = "User " + (item.userId || "ID missing");
      const delay = item.useDefaultDelay === false ? Number(item.delay || 0) : state.join.defaultDelay;
      return '<article class="roles-item-card" data-join-index="' + index + '">' +
        '<div class="roles-item-main">' +
          '<div class="roles-item-copy">' +
            '<div class="roles-item-title">' + roleChip(item.role) + "</div>" +
            '<div class="roles-item-meta">' +
              pill(audience) +
              pill(delayLabel(delay)) +
              (state.join.waitScreening ? pill("After screening", "good") : pill("On join")) +
            "</div>" +
          "</div>" +
          '<div class="roles-item-actions">' +
            '<span class="roles-sync-status" data-sync-status></span>' +
            '<button class="roles-card-action" type="button" data-join-sync="' + index + '">Sync</button>' +
            '<button class="roles-card-action" type="button" data-join-edit="' + index + '">Edit</button>' +
            '<button class="roles-card-action danger" type="button" data-join-delete="' + index + '">Delete</button>' +
          "</div>" +
        "</div>" +
      "</article>";
    }).join("");
  }

  function openJoinModal(index, opener) {
    index = Number.isInteger(index) ? index : -1;
    const current = index >= 0 ? state.join.items[index] : null;
    const audience = current && current.audience ? current.audience : "everyone";
    const useDefault = !current || current.useDefaultDelay !== false;
    let html = '<h2 id="roles-modal-title">' + (index >= 0 ? "Edit join role" : "Add join role") + "</h2>";
    html += '<p class="roles-modal-intro">Choose the role, who receives it, and when it is assigned.</p>';
    html += '<form class="roles-form" id="join-role-form">';
    html += '<label class="roles-field"><span>Role</span><input name="role" list="role-options" value="' + escapeHtml(current && current.role || "") + '" placeholder="@Member" required></label>';
    html += '<div class="roles-form-grid">';
    html += '<label class="roles-field"><span>Assign to</span><select name="audience">';
    html += '<option value="everyone"' + (audience === "everyone" ? " selected" : "") + ">All members</option>";
    html += '<option value="user"' + (audience === "user" ? " selected" : "") + ">Specific user</option>";
    html += '<option value="bots"' + (audience === "bots" ? " selected" : "") + ">Bots only</option>";
    html += "</select></label>";
    html += '<label class="roles-field" data-user-id-field' + (audience === "user" ? "" : " hidden") + '><span>User ID</span><input name="userId" value="' + escapeHtml(current && current.userId || "") + '" placeholder="123456789012345678"></label>';
    html += "</div>";
    html += '<label class="roles-check"><input name="useDefaultDelay" type="checkbox"' + (useDefault ? " checked" : "") + "> Use the default join-role delay</label>";
    html += '<label class="roles-field" data-custom-delay-field' + (useDefault ? " hidden" : "") + '><span>Custom delay in seconds</span><input name="delay" type="number" min="0" max="604800" value="' + Number(current && current.delay || 0) + '"></label>';
    html += '<p class="roles-form-note">You can sync this role after saving to apply it to members who are already in the server.</p>';
    html += modalActions(index >= 0 ? "Save changes" : "Add role");
    html += "</form>";
    openModal(html, opener);

    const form = $("#join-role-form");
    const audienceSelect = form.elements.audience;
    const defaultDelay = form.elements.useDefaultDelay;
    function updateVisibility() {
      $("[data-user-id-field]", form).hidden = audienceSelect.value !== "user";
      $("[data-custom-delay-field]", form).hidden = defaultDelay.checked;
      form.elements.userId.required = audienceSelect.value === "user";
    }
    audienceSelect.addEventListener("change", updateVisibility);
    defaultDelay.addEventListener("change", updateVisibility);
    updateVisibility();

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const item = {
        id: current && current.id || makeId(),
        role: String(data.get("role") || "").trim(),
        audience: String(data.get("audience") || "everyone"),
        userId: String(data.get("userId") || "").trim(),
        useDefaultDelay: data.get("useDefaultDelay") === "on",
        delay: Math.max(0, Number(data.get("delay") || 0))
      };
      if (index >= 0) state.join.items[index] = item;
      else state.join.items.push(item);
      saveState();
      renderJoin();
      closeModal();
      showToast(index >= 0 ? "Join role updated." : "Join role added.");
    });
  }

  function runSync(button, message) {
    const actions = button.closest(".roles-item-actions");
    const status = actions && $("[data-sync-status]", actions);
    button.disabled = true;
    if (status) status.textContent = "Syncing…";
    window.setTimeout(() => {
      button.disabled = false;
      if (status) status.textContent = "Synced";
      showToast(message);
      window.setTimeout(() => {
        if (status) status.textContent = "";
      }, 1600);
    }, 400);
  }

  function renderReaction() {
    const items = state.reaction;
    $("#reaction-count").textContent = items.length + " reaction role message" + (items.length === 1 ? "" : "s");
    const list = $("#reaction-list");
    if (!items.length) {
      list.innerHTML = emptyState("☺", "No reaction role messages", "Create a message configuration, then attach one or more emoji-to-role mappings.");
      return;
    }

    list.innerHTML = items.map((item, index) => {
      const mappings = Array.isArray(item.mappings) ? item.mappings : [];
      const rows = mappings.length ? mappings.map((mapping, mappingIndex) => {
        return '<div class="roles-subrow">' +
          '<div class="roles-subrow-copy"><span class="roles-logic-badge">' + escapeHtml(mapping.emoji || "🙂") + '</span><span aria-hidden="true">→</span>' + roleChip(mapping.role) + "</div>" +
          '<button type="button" data-reaction-map-delete="' + index + ":" + mappingIndex + '">Remove</button>' +
        "</div>";
      }).join("") : '<div class="roles-subrow"><div class="roles-subrow-copy">No emoji mappings yet.</div></div>';

      return '<article class="roles-item-card" data-reaction-index="' + index + '">' +
        '<div class="roles-item-main">' +
          '<div class="roles-item-copy">' +
            '<div class="roles-item-title">' + escapeHtml(item.name || "Reaction roles") + "</div>" +
            '<div class="roles-item-meta">' +
              pill(item.channel || "#roles") +
              pill(mappings.length + " mapping" + (mappings.length === 1 ? "" : "s")) +
              (item.removeOnUnreact ? pill("Remove on unreact", "good") : pill("Keep role")) +
            "</div>" +
          "</div>" +
          '<div class="roles-item-actions">' +
            '<button class="roles-card-action" type="button" data-reaction-map="' + index + '">+ Mapping</button>' +
            '<button class="roles-card-action" type="button" data-reaction-edit="' + index + '">Edit</button>' +
            '<button class="roles-card-action danger" type="button" data-reaction-delete="' + index + '">Delete</button>' +
          "</div>" +
        "</div>" +
        '<div class="roles-sublist">' + rows + "</div>" +
      "</article>";
    }).join("");
  }

  function openReactionModal(index, opener) {
    index = Number.isInteger(index) ? index : -1;
    if (index < 0 && state.reaction.length >= 15) {
      showToast("This preview supports up to 15 reaction role messages.");
      return;
    }
    const current = index >= 0 ? state.reaction[index] : null;
    let html = '<h2 id="roles-modal-title">' + (index >= 0 ? "Edit reaction role message" : "Create reaction role message") + "</h2>";
    html += '<p class="roles-modal-intro">Reference the Discord message that members will react to. Add emoji mappings after saving.</p>';
    html += '<form class="roles-form" id="reaction-role-form">';
    html += '<label class="roles-field"><span>Name</span><input name="name" value="' + escapeHtml(current && current.name || "") + '" placeholder="Notification roles" required></label>';
    html += '<div class="roles-form-grid">';
    html += '<label class="roles-field"><span>Channel</span><input name="channel" list="channel-options" value="' + escapeHtml(current && current.channel || "") + '" placeholder="#roles" required></label>';
    html += '<label class="roles-field"><span>Message ID or link</span><input name="message" value="' + escapeHtml(current && current.message || "") + '" placeholder="Paste message ID or link" required></label>';
    html += "</div>";
    html += '<label class="roles-check"><input name="removeOnUnreact" type="checkbox"' + (!current || current.removeOnUnreact !== false ? " checked" : "") + "> Remove the assigned role when the reaction is removed</label>";
    html += modalActions(index >= 0 ? "Save changes" : "Create message");
    html += "</form>";
    openModal(html, opener);

    $("#reaction-role-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const item = {
        id: current && current.id || makeId(),
        name: String(data.get("name") || "").trim(),
        channel: String(data.get("channel") || "").trim(),
        message: String(data.get("message") || "").trim(),
        removeOnUnreact: data.get("removeOnUnreact") === "on",
        mappings: current && Array.isArray(current.mappings) ? current.mappings : []
      };
      if (index >= 0) state.reaction[index] = item;
      else state.reaction.push(item);
      saveState();
      renderReaction();
      closeModal();
      showToast(index >= 0 ? "Reaction role message updated." : "Reaction role message created.");
    });
  }

  function openReactionMappingModal(messageIndex, opener) {
    const message = state.reaction[messageIndex];
    if (!message) return;
    let html = '<h2 id="roles-modal-title">Add reaction mapping</h2>';
    html += '<p class="roles-modal-intro">Choose the emoji and role for <strong>' + escapeHtml(message.name) + ".</strong></p>";
    html += '<form class="roles-form" id="reaction-mapping-form">';
    html += '<div class="roles-form-grid">';
    html += '<label class="roles-field"><span>Emoji</span><input name="emoji" value="✅" placeholder="✅" required></label>';
    html += '<label class="roles-field"><span>Role</span><input name="role" list="role-options" placeholder="@Member" required></label>';
    html += "</div>";
    html += modalActions("Add mapping");
    html += "</form>";
    openModal(html, opener);

    $("#reaction-mapping-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      if (!Array.isArray(message.mappings)) message.mappings = [];
      message.mappings.push({
        emoji: String(data.get("emoji") || "").trim(),
        role: String(data.get("role") || "").trim()
      });
      saveState();
      renderReaction();
      closeModal();
      showToast("Reaction mapping added.");
    });
  }

  function renderConnections() {
    const items = state.connections;
    $("#connection-count").textContent = items.length + " role connection" + (items.length === 1 ? "" : "s");
    const list = $("#connection-list");
    if (!items.length) {
      list.innerHTML = emptyState("⛓", "No role connections", "Add a target role and define which roles a member must have or must not have.");
      return;
    }

    list.innerHTML = items.map((item, index) => {
      const conditions = Array.isArray(item.conditions) ? item.conditions : [];
      const effectText = item.effect === "remove" ? "Remove target role when matched" : "Give target role when matched";
      const rows = conditions.map((condition, conditionIndex) => {
        return '<div class="roles-subrow"><div class="roles-subrow-copy">' +
          (conditionIndex > 0 ? '<span class="roles-logic-badge">' + escapeHtml(item.logic || "AND") + "</span>" : "") +
          '<span class="roles-pill ' + (condition.state === "NOT_HAVE" ? "bad" : "good") + '">' + (condition.state === "NOT_HAVE" ? "NOT HAVE" : "HAVE") + "</span>" +
          roleChip(condition.role) +
        "</div></div>";
      }).join("");

      return '<article class="roles-item-card" data-connection-index="' + index + '">' +
        '<div class="roles-item-main">' +
          '<div class="roles-item-copy">' +
            '<div class="roles-item-title">' + roleChip(item.target) + " " + pill(item.logic || "AND") + " " + pill(item.effect === "remove" ? "REMOVE" : "GIVE", item.effect === "remove" ? "warn" : "good") + "</div>" +
            '<div class="roles-item-meta">' + escapeHtml(effectText) + " · " + conditions.length + " condition" + (conditions.length === 1 ? "" : "s") + "</div>" +
          "</div>" +
          '<div class="roles-item-actions">' +
            '<span class="roles-sync-status" data-sync-status></span>' +
            '<button class="roles-card-action" type="button" data-connection-sync="' + index + '">Sync</button>' +
            '<button class="roles-card-action" type="button" data-connection-edit="' + index + '">Edit</button>' +
            '<button class="roles-card-action danger" type="button" data-connection-delete="' + index + '">Delete</button>' +
          "</div>" +
        "</div>" +
        '<div class="roles-sublist">' + rows + "</div>" +
      "</article>";
    }).join("");
  }

  function openConnectionModal(index, opener) {
    index = Number.isInteger(index) ? index : -1;
    const current = index >= 0 ? state.connections[index] : null;
    const sourceConditions = current && Array.isArray(current.conditions) && current.conditions.length
      ? current.conditions
      : [{ state: "HAVE", role: "" }];
    const draft = sourceConditions.map((condition) => ({
      state: condition.state === "NOT_HAVE" ? "NOT_HAVE" : "HAVE",
      role: condition.role || ""
    }));

    let html = '<h2 id="roles-modal-title">' + (index >= 0 ? "Edit role connection" : "Add role connection") + "</h2>";
    html += '<p class="roles-modal-intro">Select the target role, then define the role conditions that control it.</p>';
    html += '<form class="roles-form" id="connection-form">';
    html += '<div class="roles-form-grid">';
    html += '<label class="roles-field"><span>Target role</span><input name="target" list="role-options" value="' + escapeHtml(current && current.target || "") + '" placeholder="@Verified" required></label>';
    html += '<label class="roles-field"><span>When matched</span><select name="effect">';
    html += '<option value="give"' + (!current || current.effect !== "remove" ? " selected" : "") + ">Give target role</option>";
    html += '<option value="remove"' + (current && current.effect === "remove" ? " selected" : "") + ">Remove target role</option>";
    html += "</select></label>";
    html += "</div>";
    html += '<label class="roles-field"><span>Combine conditions</span><select name="logic">';
    html += '<option value="AND"' + (!current || current.logic !== "OR" ? " selected" : "") + ">AND — every condition must match</option>";
    html += '<option value="OR"' + (current && current.logic === "OR" ? " selected" : "") + ">OR — any condition can match</option>";
    html += "</select></label>";
    html += '<div class="roles-field"><span>Conditions</span><div class="roles-condition-builder" id="connection-conditions"></div>';
    html += '<button class="roles-secondary" type="button" id="connection-add-condition">+ Add condition</button></div>';
    html += '<p class="roles-form-note">Use HAVE for required roles and NOT HAVE for roles that must be absent.</p>';
    html += modalActions(index >= 0 ? "Save changes" : "Add connection");
    html += "</form>";
    openModal(html, opener);

    const container = $("#connection-conditions");
    function renderDraft() {
      container.innerHTML = draft.map((condition, conditionIndex) => {
        return '<div class="roles-condition-row" data-condition-index="' + conditionIndex + '">' +
          '<select aria-label="Condition type">' +
            '<option value="HAVE"' + (condition.state === "NOT_HAVE" ? "" : " selected") + ">HAVE</option>" +
            '<option value="NOT_HAVE"' + (condition.state === "NOT_HAVE" ? " selected" : "") + ">NOT HAVE</option>" +
          "</select>" +
          '<input list="role-options" value="' + escapeHtml(condition.role) + '" placeholder="@Role" aria-label="Condition role" required>' +
          '<button class="roles-condition-remove" type="button" aria-label="Remove condition"' + (draft.length === 1 ? " disabled" : "") + ">×</button>" +
        "</div>";
      }).join("");

      $$(".roles-condition-row", container).forEach((row) => {
        const conditionIndex = Number(row.dataset.conditionIndex);
        const select = $("select", row);
        const input = $("input", row);
        const remove = $("button", row);
        select.addEventListener("change", () => {
          draft[conditionIndex].state = select.value;
        });
        input.addEventListener("input", () => {
          draft[conditionIndex].role = input.value;
        });
        remove.addEventListener("click", () => {
          if (draft.length <= 1) return;
          draft.splice(conditionIndex, 1);
          renderDraft();
        });
      });
    }
    renderDraft();

    $("#connection-add-condition").addEventListener("click", () => {
      draft.push({ state: "HAVE", role: "" });
      renderDraft();
      const inputs = $$(".roles-condition-row input", container);
      if (inputs.length) inputs[inputs.length - 1].focus();
    });

    $("#connection-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      $$(".roles-condition-row", container).forEach((row) => {
        const conditionIndex = Number(row.dataset.conditionIndex);
        draft[conditionIndex].state = $("select", row).value;
        draft[conditionIndex].role = $("input", row).value.trim();
      });
      if (draft.some((condition) => !condition.role)) {
        showToast("Choose a role for every condition.");
        return;
      }
      const data = new FormData(form);
      const item = {
        id: current && current.id || makeId(),
        target: String(data.get("target") || "").trim(),
        effect: String(data.get("effect") || "give"),
        logic: String(data.get("logic") || "AND"),
        conditions: draft.map((condition) => ({ state: condition.state, role: condition.role }))
      };
      if (index >= 0) state.connections[index] = item;
      else state.connections.push(item);
      saveState();
      renderConnections();
      closeModal();
      showToast(index >= 0 ? "Role connection updated." : "Role connection added.");
    });
  }

  function renderSticky() {
    const items = state.sticky.items;
    $("#sticky-enabled").checked = state.sticky.enabled;
    $("#sticky-count").textContent = items.length + " sticky role" + (items.length === 1 ? "" : "s");
    const list = $("#sticky-list");
    if (!items.length) {
      list.innerHTML = emptyState("↩", "No sticky roles configured", "Add roles that should be remembered when a member leaves and restored when they return.");
      return;
    }

    list.innerHTML = items.map((item, index) => {
      return '<article class="roles-item-card" data-sticky-index="' + index + '">' +
        '<div class="roles-item-main">' +
          '<div class="roles-item-copy">' +
            '<div class="roles-item-title">' + roleChip(item.role) + "</div>" +
            '<div class="roles-item-meta">' +
              (item.waitScreening ? pill("Restore after screening", "good") : pill("Restore on rejoin")) +
              (state.sticky.enabled ? pill("Enabled", "good") : pill("Paused", "warn")) +
            "</div>" +
          "</div>" +
          '<div class="roles-item-actions">' +
            '<button class="roles-card-action" type="button" data-sticky-edit="' + index + '">Edit</button>' +
            '<button class="roles-card-action danger" type="button" data-sticky-delete="' + index + '">Delete</button>' +
          "</div>" +
        "</div>" +
      "</article>";
    }).join("");
  }

  function openStickyModal(index, opener) {
    index = Number.isInteger(index) ? index : -1;
    const current = index >= 0 ? state.sticky.items[index] : null;
    let html = '<h2 id="roles-modal-title">' + (index >= 0 ? "Edit sticky role" : "Add sticky role") + "</h2>";
    html += '<p class="roles-modal-intro">Next Step will remember this role when a member leaves and restore it when they return.</p>';
    html += '<form class="roles-form" id="sticky-role-form">';
    html += '<label class="roles-field"><span>Role</span><input name="role" list="role-options" value="' + escapeHtml(current && current.role || "") + '" placeholder="@Returning Member" required></label>';
    html += '<label class="roles-check"><input name="waitScreening" type="checkbox"' + (!current || current.waitScreening !== false ? " checked" : "") + "> Wait until the returning member passes rules screening</label>";
    html += modalActions(index >= 0 ? "Save changes" : "Add sticky role");
    html += "</form>";
    openModal(html, opener);

    $("#sticky-role-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const item = {
        id: current && current.id || makeId(),
        role: String(data.get("role") || "").trim(),
        waitScreening: data.get("waitScreening") === "on"
      };
      if (index >= 0) state.sticky.items[index] = item;
      else state.sticky.items.push(item);
      saveState();
      renderSticky();
      closeModal();
      showToast(index >= 0 ? "Sticky role updated." : "Sticky role added.");
    });
  }

  function openHelp(opener) {
    let html = '<h2 id="roles-modal-title">Roles help</h2>';
    html += '<p class="roles-modal-intro">The Roles workspace combines the four requested role-management areas for Next Step.</p>';
    html += '<div class="roles-form">';
    html += '<div class="roles-intro"><h2>Join Roles</h2><p>Assign roles at join, after rules screening, after a delay, to a specific user, and sync roles to current members.</p></div>';
    html += '<div class="roles-intro"><h2>Reaction Roles</h2><p>Reference a Discord message and map emoji reactions to roles.</p></div>';
    html += '<div class="roles-intro"><h2>Role Connections</h2><p>Give or remove a target role when HAVE or NOT HAVE conditions match, using AND or OR logic.</p></div>';
    html += '<div class="roles-intro"><h2>Sticky Roles</h2><p>Restore selected roles after a member leaves and rejoins.</p></div>';
    html += '<div class="roles-modal-actions"><button class="roles-primary" type="button" data-modal-cancel>Close</button></div>';
    html += "</div>";
    openModal(html, opener);
  }

  function renderAll() {
    renderJoin();
    renderReaction();
    renderConnections();
    renderSticky();
  }

  $$("[data-role-tab]").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.roleTab));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const tabs = $$("[data-role-tab]");
      const index = tabs.indexOf(button);
      let next = index;
      if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      tabs[next].click();
      tabs[next].focus();
    });
  });

  $("#join-default-delay").addEventListener("change", (event) => {
    state.join.defaultDelay = Math.max(0, Number(event.target.value || 0));
    saveState();
    renderJoin();
    showToast("Default join-role delay saved.");
  });

  $("#join-wait-screening").addEventListener("change", (event) => {
    state.join.waitScreening = event.target.checked;
    saveState();
    renderJoin();
    showToast("Join role behavior saved.");
  });

  $("#sticky-enabled").addEventListener("change", (event) => {
    state.sticky.enabled = event.target.checked;
    saveState();
    renderSticky();
    showToast(event.target.checked ? "Sticky role restoration enabled." : "Sticky role restoration paused.");
  });

  $("#join-add").addEventListener("click", (event) => openJoinModal(-1, event.currentTarget));
  $("#reaction-add").addEventListener("click", (event) => openReactionModal(-1, event.currentTarget));
  $("#connection-add").addEventListener("click", (event) => openConnectionModal(-1, event.currentTarget));
  $("#sticky-add").addEventListener("click", (event) => openStickyModal(-1, event.currentTarget));
  $("#roles-help").addEventListener("click", (event) => openHelp(event.currentTarget));

  $("#join-sync-all").addEventListener("click", () => {
    if (!state.join.items.length) {
      showToast("Add a join role before syncing.");
      return;
    }
    showToast("Synchronized " + state.join.items.length + " join role" + (state.join.items.length === 1 ? "." : "s."));
  });

  $("#connection-sync-all").addEventListener("click", () => {
    if (!state.connections.length) {
      showToast("Add a role connection before syncing.");
      return;
    }
    showToast("Synchronized " + state.connections.length + " role connection" + (state.connections.length === 1 ? "." : "s."));
  });

  $("#join-list").addEventListener("click", (event) => {
    const edit = event.target.closest("[data-join-edit]");
    const remove = event.target.closest("[data-join-delete]");
    const sync = event.target.closest("[data-join-sync]");
    if (edit) openJoinModal(Number(edit.dataset.joinEdit), edit);
    if (sync) {
      const index = Number(sync.dataset.joinSync);
      runSync(sync, (state.join.items[index] && state.join.items[index].role || "Role") + " synchronized.");
    }
    if (remove) {
      const index = Number(remove.dataset.joinDelete);
      const name = state.join.items[index] && state.join.items[index].role || "Role";
      state.join.items.splice(index, 1);
      saveState();
      renderJoin();
      showToast(name + " removed from join roles.");
    }
  });

  $("#reaction-list").addEventListener("click", (event) => {
    const edit = event.target.closest("[data-reaction-edit]");
    const remove = event.target.closest("[data-reaction-delete]");
    const mapping = event.target.closest("[data-reaction-map]");
    const mappingRemove = event.target.closest("[data-reaction-map-delete]");
    if (edit) openReactionModal(Number(edit.dataset.reactionEdit), edit);
    if (mapping) openReactionMappingModal(Number(mapping.dataset.reactionMap), mapping);
    if (mappingRemove) {
      const parts = mappingRemove.dataset.reactionMapDelete.split(":").map(Number);
      const message = state.reaction[parts[0]];
      if (message && Array.isArray(message.mappings)) message.mappings.splice(parts[1], 1);
      saveState();
      renderReaction();
      showToast("Reaction mapping removed.");
    }
    if (remove) {
      state.reaction.splice(Number(remove.dataset.reactionDelete), 1);
      saveState();
      renderReaction();
      showToast("Reaction role message deleted.");
    }
  });

  $("#connection-list").addEventListener("click", (event) => {
    const edit = event.target.closest("[data-connection-edit]");
    const remove = event.target.closest("[data-connection-delete]");
    const sync = event.target.closest("[data-connection-sync]");
    if (edit) openConnectionModal(Number(edit.dataset.connectionEdit), edit);
    if (sync) {
      const index = Number(sync.dataset.connectionSync);
      runSync(sync, (state.connections[index] && state.connections[index].target || "Connection") + " synchronized.");
    }
    if (remove) {
      state.connections.splice(Number(remove.dataset.connectionDelete), 1);
      saveState();
      renderConnections();
      showToast("Role connection deleted.");
    }
  });

  $("#sticky-list").addEventListener("click", (event) => {
    const edit = event.target.closest("[data-sticky-edit]");
    const remove = event.target.closest("[data-sticky-delete]");
    if (edit) openStickyModal(Number(edit.dataset.stickyEdit), edit);
    if (remove) {
      state.sticky.items.splice(Number(remove.dataset.stickyDelete), 1);
      saveState();
      renderSticky();
      showToast("Sticky role removed.");
    }
  });

  $("#roles-modal-close").addEventListener("click", closeModal);
  $("#roles-modal-overlay").addEventListener("click", (event) => {
    if (event.target.id === "roles-modal-overlay") closeModal();
  });
  $("#roles-modal-content").addEventListener("click", (event) => {
    if (event.target.closest("[data-modal-cancel]")) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("#roles-modal-overlay").hidden) closeModal();
  });

  window.addEventListener("hashchange", () => setActiveTab(tabFromHash(), false));

  renderAll();
  setActiveTab(tabFromHash(), false);
})();
