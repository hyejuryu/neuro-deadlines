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
  localTimezone: document.querySelector("#local-timezone"),
  lastUpdate: document.querySelector("#last-update"),
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
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(parseDateOnly(value));
}

function formatCompactDate(value) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(parseDateOnly(value));
}

function formatEventRange(event) {
  const start = formatCompactDate(event.start);
  const end = event.end && event.end !== event.start ? ` – ${formatCompactDate(event.end)}` : "";
  return `${start}${end} // ${event.location}${event.note ? ` // ${event.note}` : ""}`;
}

function deadlineStatus(deadline) {
  const today = localDateString();

  if (deadline.datetime) {
    if (new Date(deadline.datetime).getTime() <= Date.now()) return "closed";
  } else if (deadline.date < today) {
    return "closed";
  }

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
  if (days < 0) return "Past deadline";
  if (days === 0) return "Due today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

function exactCountdown(isoDatetime) {
  const ms = new Date(isoDatetime).getTime() - Date.now();
  if (ms <= 0) return "Past deadline";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function nextDeadlineTime(conference) {
  const future = conference.deadlines
    .filter(deadline => deadlineStatus(deadline) !== "closed")
    .map(deadline =>
      deadline.datetime
        ? new Date(deadline.datetime).getTime()
        : parseDateOnly(deadline.date).getTime()
    )
    .sort((a, b) => a - b);

  return future[0] ?? Number.POSITIVE_INFINITY;
}

function setupAreaFilters(conferences) {
  const presentAreas = [...new Set(conferences.flatMap(c => c.areas))]
    .sort((a, b) => (AREA_LABELS[a] || a).localeCompare(AREA_LABELS[b] || b));

  for (const area of presentAreas) {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = area;
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.activeAreas.add(area);
      else state.activeAreas.delete(area);
      render();
    });

    label.append(checkbox, document.createTextNode(` ${AREA_LABELS[area] || area}`));
    els.areaFilters.appendChild(label);
  }
}

function conferenceMatches(conference) {
  const status = conferenceStatus(conference);
  if (!state.showClosed && status === "closed") return false;
  if (!state.showTba && status === "tba") return false;
  if (state.activeAreas.size && !conference.areas.some(area => state.activeAreas.has(area))) return false;

  if (state.query) {
    const haystack = [
      conference.name,
      conference.full_name,
      conference.event.location,
      conference.event.note || "",
      ...conference.areas.map(area => AREA_LABELS[area] || area),
      ...conference.deadlines.map(deadline =>
        `${deadline.label} ${deadline.type} ${deadline.note || ""}`
      )
    ].join(" ").toLowerCase();

    if (!haystack.includes(state.query)) return false;
  }

  return true;
}

function appendDeadline(column, deadline) {
  const status = deadlineStatus(deadline);
  if (!state.showClosed && status === "closed") return;

  const item = document.createElement("div");
  item.className = "deadline-item";
  if (status === "closed") item.classList.add("past");

  const label = document.createElement("div");
  label.className = "deadline-label";
  label.textContent = `${deadline.label}:`;

  const timer = document.createElement("div");
  timer.className = "timer";
  if (deadline.datetime) timer.dataset.datetime = deadline.datetime;
  timer.textContent = deadline.datetime
    ? exactCountdown(deadline.datetime)
    : dateOnlyCountdown(deadline.date);

  const date = document.createElement("div");
  date.className = "deadline-date";
  const source = document.createElement("a");
  source.href = deadline.source_url;
  source.target = "_blank";
  source.rel = "noreferrer";
  source.textContent = "source";
  date.append(
    document.createTextNode(`${formatCompactDate(deadline.date)}${deadline.datetime ? "" : " · time not specified"} · `),
    source
  );

  item.append(label, timer, date);

  if (deadline.note) {
    const note = document.createElement("div");
    note.className = "deadline-note";
    note.textContent = deadline.note;
    item.appendChild(note);
  }

  column.appendChild(item);
}

function buildCard(conference) {
  const fragment = els.template.content.cloneNode(true);
  const row = fragment.querySelector(".conference-row");
  const link = fragment.querySelector(".conference-link");
  const fullName = fragment.querySelector(".conference-full-name");
  const eventMeta = fragment.querySelector(".event-meta");
  const column = fragment.querySelector(".deadline-column");

  link.textContent = `${conference.name} ${conference.year}`;
  link.href = conference.website;
  fullName.textContent = conference.full_name;
  eventMeta.textContent = formatEventRange(conference.event);

  if (conference.deadlines.length) {
    conference.deadlines.forEach(deadline => appendDeadline(column, deadline));
    if (!column.children.length) {
      const copy = document.createElement("div");
      copy.className = "tba-copy";
      copy.textContent = "No active deadlines. Select ‘Past deadlines’ to show earlier dates.";
      column.appendChild(copy);
    }
  } else {
    const timer = document.createElement("div");
    timer.className = "timer";
    timer.textContent = "TBA";

    const copy = document.createElement("div");
    copy.className = "tba-copy";
    copy.textContent = conference.tba_note || "Submission dates have not been announced yet.";

    column.append(timer, copy);
  }

  if (conferenceStatus(conference) === "closed") row.classList.add("past");
  return fragment;
}

function render() {
  const filtered = state.data.conferences
    .filter(conferenceMatches)
    .sort((a, b) => {
      const rank = { open: 0, upcoming: 1, tba: 2, closed: 3 };
      const statusDiff = rank[conferenceStatus(a)] - rank[conferenceStatus(b)];
      if (statusDiff) return statusDiff;
      const deadlineDiff = nextDeadlineTime(a) - nextDeadlineTime(b);
      if (deadlineDiff) return deadlineDiff;
      return a.event.start.localeCompare(b.event.start);
    });

  els.list.replaceChildren(...filtered.map(buildCard));
  els.resultCount.textContent = `${filtered.length} conference${filtered.length === 1 ? "" : "s"}`;
  els.empty.hidden = filtered.length !== 0;
}

function refreshExactCountdowns() {
  let statusChanged = false;

  document.querySelectorAll("[data-datetime]").forEach(node => {
    const previous = node.textContent;
    const next = exactCountdown(node.dataset.datetime);
    node.textContent = next;

    if (previous !== "Past deadline" && next === "Past deadline") {
      statusChanged = true;
    }
  });

  if (statusChanged) render();
}

async function init() {
  els.localTimezone.textContent = `Times shown in ${Intl.DateTimeFormat().resolvedOptions().timeZone || "local time"}`;

  try {
    const response = await fetch("data/conferences.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
  } catch (error) {
    els.list.innerHTML = `<p class="empty-state">Could not load conference data. ${error.message}</p>`;
    return;
  }

  els.lastUpdate.textContent = formatDate(state.data.updated_on);
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
