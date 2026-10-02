"use strict";

const AREA_LABELS = {
  general: "General neuroscience",
  computational: "Computational",
  systems: "Systems",
  cognitive: "Cognitive",
  neuroimaging: "Neuroimaging",
  eeg_meg: "EEG / MEG",
  bci: "BCI",
  neurotech: "Neurotechnology",
  neuroai: "NeuroAI"
};

const state = {
  data: null,
  activeAreas: new Set(),
  query: "",
  showClosed: false,
  showTba: true
};

const els = {
  search: document.querySelector("#search"),
  areaFilters: document.querySelector("#area-filters"),
  showClosed: document.querySelector("#show-closed"),
  showTba: document.querySelector("#show-tba"),
  list: document.querySelector("#conference-list"),
  resultCount: document.querySelector("#result-count"),
  dataUpdated: document.querySelector("#data-updated"),
  localTimezone: document.querySelector("#local-timezone"),
  empty: document.querySelector("#empty-state"),
  template: document.querySelector("#conference-template")
};

function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateOnly(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value) {
  const date = parseDateOnly(value);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatEventRange(event) {
  const start = formatDate(event.start);
  const end = event.end && event.end !== event.start ? `–${formatDate(event.end)}` : "";
  return `${start}${end} · ${event.location}`;
}

function deadlineStatus(deadline) {
  const today = localDateString();
  if (deadline.date < today) return "closed";
  if (deadline.opens_on && deadline.opens_on > today) return "upcoming";
  return "open";
}

function conferenceStatus(conference) {
  if (!conference.deadlines.length) return "tba";
  const statuses = conference.deadlines.map(deadlineStatus);
  if (statuses.includes("open")) return "open";
  if (statuses.includes("upcoming")) return "upcoming";
  return "closed";
}

function dateOnlyCountdown(deadlineDate) {
  const today = parseDateOnly(localDateString());
  const target = parseDateOnly(deadlineDate);
  const days = Math.round((target - today) / 86400000);
  if (days < 0) return "Closed";
  if (days === 0) return "Due today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

function exactCountdown(isoDatetime) {
  const ms = new Date(isoDatetime).getTime() - Date.now();
  if (ms <= 0) return "Closed";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function nextDeadlineDate(conference) {
  const today = localDateString();
  const future = conference.deadlines
    .filter(d => d.date >= today)
    .map(d => d.date)
    .sort();
  return future[0] || "9999-12-31";
}

function setupAreaFilters(conferences) {
  const presentAreas = [...new Set(conferences.flatMap(c => c.areas))]
    .sort((a, b) => (AREA_LABELS[a] || a).localeCompare(AREA_LABELS[b] || b));

  for (const area of presentAreas) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = AREA_LABELS[area] || area;
    button.dataset.area = area;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      if (state.activeAreas.has(area)) state.activeAreas.delete(area);
      else state.activeAreas.add(area);
      button.setAttribute("aria-pressed", String(state.activeAreas.has(area)));
      render();
    });
    els.areaFilters.appendChild(button);
  }
}

function conferenceMatches(conference) {
  const status = conferenceStatus(conference);
  if (!state.showClosed && status === "closed") return false;
  if (!state.showTba && status === "tba") return false;
  if (state.activeAreas.size && !conference.areas.some(a => state.activeAreas.has(a))) return false;

  if (state.query) {
    const haystack = [
      conference.name,
      conference.full_name,
      conference.event.location,
      ...conference.areas.map(a => AREA_LABELS[a] || a),
      ...conference.deadlines.map(d => `${d.label} ${d.type} ${d.note || ""}`)
    ].join(" ").toLowerCase();
    if (!haystack.includes(state.query)) return false;
  }

  return true;
}

function appendDeadline(panel, deadline) {
  if (!state.showClosed && deadlineStatus(deadline) === "closed") return;

  const item = document.createElement("div");
  item.className = "deadline-item";

  const labelRow = document.createElement("div");
  labelRow.className = "deadline-label";
  const label = document.createElement("span");
  label.textContent = deadline.label;
  const source = document.createElement("a");
  source.href = deadline.source_url;
  source.target = "_blank";
  source.rel = "noreferrer";
  source.textContent = "official source";
  labelRow.append(label, source);

  const countdown = document.createElement("div");
  countdown.className = "countdown";
  countdown.dataset.deadline = deadline.date;
  if (deadline.datetime) countdown.dataset.datetime = deadline.datetime;
  countdown.textContent = deadline.datetime
    ? exactCountdown(deadline.datetime)
    : dateOnlyCountdown(deadline.date);

  const date = document.createElement("div");
  date.className = "deadline-date";
  date.textContent = deadline.datetime
    ? `${formatDate(deadline.date)} · exact time published`
    : `${formatDate(deadline.date)} · time not specified by source`;

  item.append(labelRow, countdown, date);

  if (deadline.note) {
    const note = document.createElement("div");
    note.className = "deadline-note";
    note.textContent = deadline.note;
    item.appendChild(note);
  }

  const verified = document.createElement("div");
  verified.className = "verified";
  verified.textContent = `Verified ${deadline.verified_on}`;
  item.appendChild(verified);

  panel.appendChild(item);
}

function buildCard(conference) {
  const fragment = els.template.content.cloneNode(true);
  const card = fragment.querySelector(".conference-card");
  const link = fragment.querySelector(".conference-link");
  const fullName = fragment.querySelector(".conference-full-name");
  const eventMeta = fragment.querySelector(".event-meta");
  const badge = fragment.querySelector(".status-badge");
  const tags = fragment.querySelector(".tag-row");
  const panel = fragment.querySelector(".deadline-panel");

  link.textContent = `${conference.name} ${conference.year}`;
  link.href = conference.website;
  fullName.textContent = conference.full_name;
  eventMeta.textContent = formatEventRange(conference.event);
  if (conference.event.note) eventMeta.textContent += ` · ${conference.event.note}`;

  const status = conferenceStatus(conference);
  badge.textContent = status.toUpperCase();
  badge.classList.add(`status-${status}`);

  for (const area of conference.areas) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = AREA_LABELS[area] || area;
    tags.appendChild(tag);
  }

  if (conference.deadlines.length) {
    for (const deadline of conference.deadlines) appendDeadline(panel, deadline);
    if (!panel.children.length) {
      const copy = document.createElement("p");
      copy.className = "tba-copy";
      copy.textContent = "No active deadlines. Enable ‘Show closed deadlines’ to view past dates.";
      panel.appendChild(copy);
    }
  } else {
    const copy = document.createElement("p");
    copy.className = "tba-copy";
    copy.textContent = conference.tba_note || "Submission dates have not been announced yet.";
    panel.appendChild(copy);

    const verified = document.createElement("div");
    verified.className = "verified";
    verified.textContent = `Verified ${conference.verified_on}`;
    panel.appendChild(verified);
  }

  card.dataset.id = conference.id;
  return fragment;
}

function render() {
  const filtered = state.data.conferences
    .filter(conferenceMatches)
    .sort((a, b) => {
      const aStatus = conferenceStatus(a);
      const bStatus = conferenceStatus(b);
      const rank = { open: 0, upcoming: 1, tba: 2, closed: 3 };
      return rank[aStatus] - rank[bStatus]
        || nextDeadlineDate(a).localeCompare(nextDeadlineDate(b))
        || a.event.start.localeCompare(b.event.start);
    });

  els.list.replaceChildren(...filtered.map(buildCard));
  els.resultCount.textContent = `${filtered.length} conference${filtered.length === 1 ? "" : "s"}`;
  els.empty.hidden = filtered.length !== 0;
}

function refreshExactCountdowns() {
  document.querySelectorAll("[data-datetime]").forEach(node => {
    node.textContent = exactCountdown(node.dataset.datetime);
  });
}

async function init() {
  els.localTimezone.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";

  try {
    const response = await fetch("data/conferences.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
  } catch (error) {
    els.list.innerHTML = `<p class="empty-state">Could not load conference data. ${error.message}</p>`;
    return;
  }

  els.dataUpdated.textContent = `Dataset updated ${state.data.updated_on}`;
  setupAreaFilters(state.data.conferences);

  els.search.addEventListener("input", event => {
    state.query = event.target.value.trim().toLowerCase();
    render();
  });
  els.showClosed.addEventListener("change", event => {
    state.showClosed = event.target.checked;
    render();
  });
  els.showTba.addEventListener("change", event => {
    state.showTba = event.target.checked;
    render();
  });

  render();
  setInterval(refreshExactCountdowns, 1000);
}

init();
