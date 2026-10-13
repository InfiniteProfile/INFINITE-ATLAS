"use strict";

const $ = (selector) => document.querySelector(selector);

const grid = $("#profileGrid");
const searchInput = $("#searchInput");
const jumpInput = $("#jumpInput");
const loading = $("#loading");
const sentinel = $("#sentinel");

const BATCH_SIZE = 12;
const MAX_VISIBLE = 48;

let nextNumber = 1n;
let visibleCards = 0;
let isLoading = false;
let generation = 0;
let observer = null;

const firstNames = [
"Aether", "Zyron", "Kaelis", "Veyra", "Orion",
"Nyx", "Azriel", "Elara", "Caelum", "Zerith",
"Aurelia", "Riven", "Solara", "Eryx", "Luneth",
"Valen", "Xyra", "Noctis", "Ardyn", "Seren",
"Evren", "Thalen", "Ivara", "Zephyr", "Lyra",
"Oryn", "Vaelis", "Cyran", "Astra", "Zevran"
];

const lastNames = [
"Voss", "Astralis", "Nocturne", "Evernight", "Solstice",
"Draven", "Starfall", "Aetherion", "Blackwell", "Raventhorn",
"Silverwind", "Duskborne", "Valorian", "Nightveil", "Stormborn",
"Ashford", "Mooncrest", "Voidwalker", "Emberlyn", "Skyborne",
"Wintermere", "Dawnbringer", "Shadowmere", "Eclipse", "Onyx"
];

const roles = [
"Cosmic Explorer", "Keeper of Secrets", "Void Architect",
"Starborn Wanderer", "Unknown Entity", "Celestial Observer",
"Digital Nomad", "Guardian of Time", "Dream Cartographer",
"Quantum Traveler", "Lost Civilization", "Silent Voyager",
"Astral Pioneer", "Reality Architect", "Infinite Observer"
];

const symbols = [
"∞", "✦", "◇", "△", "◈", "⌘", "✧", "○",
"⬡", "✳", "⊙", "⋄", "⟡", "※", "✺", "◉"
];

const themes = [
"#d4af37", "#8c79e6", "#66c5d8", "#d47777",
"#9dbd83", "#d59cce", "#e4a15c", "#8da7df"
];

// Stable string hash: no unsafe conversion of the profile number to Number.
function hashString(value) {
let hash = 2166136261;

for (let i = 0; i < value.length; i++) {
hash ^= value.charCodeAt(i);
hash = Math.imul(hash, 16777619);
}

return hash >>> 0;
}

function makeRandom(seed) {
let state = seed >>> 0;

return function () {
state += 0x6D2B79F5;
let t = state;
t = Math.imul(t ^ (t >>> 15), t | 1);
t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
}

function profileData(number) {
const id = number.toString();
const random = makeRandom(hashString(id));

const pick = (list) => list[Math.floor(random() * list.length)];

return {
id,
name: pick(firstNames) + " " + pick(lastNames),
role: pick(roles),
symbol: pick(symbols),
color: pick(themes)
};
}

function makeCard(number) {
const profile = profileData(number);
const card = document.createElement("article");

card.className = "profile-card";
card.dataset.id = profile.id;

const top = document.createElement("div");
top.className = "card-top";

const avatar = document.createElement("div");
avatar.className = "avatar";
avatar.textContent = profile.symbol;
avatar.style.color = profile.color;
avatar.style.borderColor = profile.color;

const numberLabel = document.createElement("span");
numberLabel.className = "profile-number";
numberLabel.textContent = "#" + profile.id;

top.append(avatar, numberLabel);

const name = document.createElement("h3");
name.className = "profile-name";
name.textContent = profile.name;

const role = document.createElement("div");
role.className = "profile-role";
role.textContent = profile.role;

const bottom = document.createElement("div");
bottom.className = "card-bottom";

const label = document.createElement("span");
label.textContent = "IDENTITY VERIFIED";

const open = document.createElement("button");
open.type = "button";
open.textContent = "EXPLORE ↗";
open.setAttribute("aria-label", "Explore profile " + profile.id);

open.addEventListener("click", () => openProfile(number));

bottom.append(label, open);
card.append(top, name, role, bottom);

return card;
}

function updateStats() {
$("#position").textContent = "#" + (nextNumber - 1n);
$("#count").textContent = visibleCards + " IDENTITIES";
}

function renderBatch() {
if (isLoading) return;

isLoading = true;
loading.hidden = false;

const currentGeneration = generation;
const fragment = document.createDocumentFragment();

for (let i = 0; i < BATCH_SIZE; i++) {
fragment.append(makeCard(nextNumber));
nextNumber++;
}

// The batch is small; yield before inserting it to keep scrolling responsive.
requestAnimationFrame(() => {
if (currentGeneration !== generation) {
isLoading = false;
return;
}

grid.append(fragment);
visibleCards += BATCH_SIZE;

// Recycle old cards to prevent the DOM from growing without bound.
while (grid.children.length > MAX_VISIBLE) {
  grid.firstElementChild.remove();
}

updateStats();
loading.hidden = false;
isLoading = false;

});
}

function resetDirectory(startNumber = 1n) {
generation++;

if (observer) observer.disconnect();

grid.replaceChildren();
visibleCards = 0;
nextNumber = startNumber;
isLoading = false;

renderBatch();

if ("IntersectionObserver" in window) {
observer = new IntersectionObserver((entries) => {
if (entries.some(entry => entry.isIntersecting)) {
renderBatch();
}
}, {
rootMargin: "500px 0px"
});

observer.observe(sentinel);

}
}

function parseNumber(value) {
const cleaned = value.trim();

// Only positive decimal integers. No Number conversion, rounding, or truncation.
if (!/^[0-9]+$/.test(cleaned)) {
return null;
}

try {
const result = BigInt(cleaned);
return result >= 1n ? result : null;
} catch {
return null;
}
}

function openProfile(number) {
const id = number.toString();
searchInput.value = id;

const params = new URLSearchParams(location.search);
params.set("profile", id);

history.replaceState(null, "", "?" + params.toString());

const profile = profileData(number);
showToast("IDENTITY #" + id + " · " + profile.name);
}

function showToast(message) {
let toast = $("#toast");

if (!toast) {
toast = document.createElement("div");
toast.id = "toast";
toast.setAttribute("role", "status");

Object.assign(toast.style, {
  position: "fixed",
  bottom: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: "10",
  maxWidth: "90%",
  padding: "14px 18px",
  background: "#19170f",
  color: "#d4af37",
  border: "1px solid #6e5927",
  fontSize: "12px",
  overflowWrap: "anywhere"
});

document.body.append(toast);

}

toast.textContent = message;
toast.hidden = false;

clearTimeout(showToast.timer);
showToast.timer = setTimeout(() => {
toast.hidden = true;
}, 2600);
}

function searchProfile(value) {
const number = parseNumber(value);

if (number === null) {
showToast("Enter a positive whole-number profile ID.");
return;
}

// Generate the requested identity directly; do not scan preceding IDs.
resetDirectory(number);

const params = new URLSearchParams(location.search);
params.set("profile", number.toString());
history.replaceState(null, "", "?" + params.toString());

window.scrollTo({ top: 0, behavior: "smooth" });
}

$("#searchForm").addEventListener("submit", (event) => {
event.preventDefault();
searchProfile(searchInput.value);
});

$("#jumpForm").addEventListener("submit", (event) => {
event.preventDefault();
searchProfile(jumpInput.value);
});

document.querySelectorAll(".example").forEach(button => {
button.addEventListener("click", () => {
const id = button.dataset.number;
searchInput.value = id;
searchProfile(id);
});
});

// Restore a directly linked profile, if present.
const initialParams = new URLSearchParams(location.search);
const initialProfile = initialParams.get("profile");
const parsedInitial = initialProfile === null
? null
: parseNumber(initialProfile);

if (parsedInitial !== null) {
searchInput.value = parsedInitial.toString();
resetDirectory(parsedInitial);
} else {
resetDirectory(1n);
}
