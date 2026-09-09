const CARD_VERSION = "1.0.2";
const POLL_MS = 1000;
const MAX_DIST = 250;
const MAX_TRAIL = 64;

const MAPS = {
  dark: { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attr: "© OSM © CARTO", sub: "abcd" },
  light: { url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", attr: "© OSM © CARTO", sub: "abcd" },
  streets: { url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", attr: "© OSM © CARTO", sub: "abcd" },
  osm: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "© OpenStreetMap", sub: "abc" },
  sat: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "Tiles © Esri" },
  terrain: { url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attr: "© OSM © OpenTopoMap", sub: "abc" },
};

const SHAPES = {
  unknown: { vb: "0 0 32 32", d: "M16 2 L19 14 L30 16 L19 18 L16 30 L13 18 L2 16 L13 14 Z" },
  airliner: { vb: "0 0 32 32", d: "M16 1 L18 13 L31 18 L18 19 L16 31 L14 19 L1 18 L14 13 Z" },
  heli: { vb: "0 0 32 32", d: "M2 10 H30 M16 10 V26 M10 26 H22 M8 8 H24" },
  fighter: { vb: "0 0 32 32", d: "M16 1 L22 14 L31 16 L22 17 L18 31 L16 24 L14 31 L10 17 L1 16 L10 14 Z" },
};

const TYPE_SHAPE = {
  A319: "airliner", A320: "airliner", A321: "airliner", A20N: "airliner", A21N: "airliner",
  B737: "airliner", B738: "airliner", B739: "airliner", B38M: "airliner", B39M: "airliner",
  B77W: "airliner", B789: "airliner", B788: "airliner", A333: "airliner", A359: "airliner",
  C172: "unknown", P28A: "unknown",
};
["H47","CH47","CH47D","CH47F","H64","AH64","AH64D","H60","UH60","A139","EC35","EC45","B06","R44","R22","S92","A109"].forEach((t) => { TYPE_SHAPE[t] = "heli"; });
["F16","F16C","F18","F22","F35","F35A","F15","A10","EUFI","TYPH","RAFA"].forEach((t) => { TYPE_SHAPE[t] = "fighter"; });

function altColor(alt) {
  if (alt == null) return "#9e9e9e";
  if (alt === "ground") return "#8d6e63";
  const t = Math.max(0, Math.min(1, alt / 40000));
  const h = (1 - t) * 240;
  return `hsl(${h}, 90%, 58%)`;
}

function haversineNm(aLat, aLon, bLat, bLon) {
  const R = 3440.065;
  const p1 = (aLat * Math.PI) / 180;
  const p2 = (bLat * Math.PI) / 180;
  const dphi = ((bLat - aLat) * Math.PI) / 180;
  const dl = ((bLon - aLon) * Math.PI) / 180;
  const h = Math.sin(dphi / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function callsign(ac) {
  return (ac.flight || ac.r || ac.hex || "").trim() || ac.hex;
}

function classify(ac) {
  const t = (ac.t || "").toUpperCase();
  const f = (ac.flight || "").toUpperCase().replace(/\s+/g, "");
  const kinds = [];
  if (["7500", "7600", "7700"].includes(ac.squawk) || ac.emergency) kinds.push("emergency");
  if (["H47", "CH47", "CH47D", "CH47F", "MH47"].includes(t)) kinds.push("chinook");
  if (["H64", "AH64", "AH64A", "AH64D", "AH64E"].includes(t)) kinds.push("apache");
  if (["H60", "UH60", "UH60L", "UH60M", "HH60", "SH60"].includes(t)) kinds.push("blackhawk");
  if (["F16", "F16C", "F18", "F22", "F35", "F35A", "F15", "A10", "EUFI", "TYPH"].includes(t)) kinds.push("fighter");
  if (ac.category === "A7" || TYPE_SHAPE[t] === "heli") kinds.push("helicopter");
  if (/^(UKP|NPOL|POLICE|GEND|SHRF|CHP)/.test(f) || f.includes("POLICE")) kinds.push("police");
  if ((ac.dbFlags || 0) & 1) kinds.push("military");
  return kinds;
}

function slim(raw) {
  if (!raw) return null;
  const hex = String(raw.hex || "").toLowerCase();
  const lat = raw.lat;
  const lon = raw.lon;
  if (!hex || lat == null || lon == null) return null;
  const alt = raw.alt != null ? raw.alt : raw.alt_baro;
  return {
    hex,
    flight: String(raw.flight || "").trim(),
    r: String(raw.r || "").trim(),
    t: String(raw.t || "").trim(),
    alt: alt === "ground" ? "ground" : (typeof alt === "number" ? alt : null),
    gs: raw.gs,
    track: raw.track,
    squawk: String(raw.squawk || "").trim(),
    category: raw.category || "",
    lat: Number(lat),
    lon: Number(lon),
    seen: raw.seen || 0,
    dbFlags: raw.dbFlags || 0,
    emergency: raw.emergency && raw.emergency !== "none" ? raw.emergency : "",
    dst: raw.dst,
  };
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    const el = document.createElement("script");
    el.src = src;
    el.onload = () => (window.L ? resolve(window.L) : reject(new Error("no L")));
    el.onerror = () => reject(new Error(src));
    document.head.appendChild(el);
  });
}

function loadCss(href) {
  if ([...document.querySelectorAll("link")].some((s) => s.href && s.href.includes("leaflet.css"))) return;
  const el = document.createElement("link");
  el.rel = "stylesheet";
  el.href = href;
  document.head.appendChild(el);
}

function ensureLeafletCss() {
  if (document.getElementById("adsb-leaflet-css")) return;
  if (window.__ADSB_LEAFLET_CSS__) {
    const s = document.createElement("style");
    s.id = "adsb-leaflet-css";
    s.textContent = window.__ADSB_LEAFLET_CSS__;
    document.head.appendChild(s);
    return;
  }
  ["/adsb_globe/leaflet.css", "/local/adsb_globe/leaflet.css", "/hacsfiles/ha-adsb-globe/leaflet.css"].forEach(loadCss);
}

async function ensureLeaflet() {
  if (window.L) return window.L;
  const urls = [
    "/adsb_globe/leaflet.js",
    "/local/adsb_globe/leaflet.js",
    "/hacsfiles/ha-adsb-globe/leaflet.js",
  ];
  for (const u of urls) {
    try {
      await loadScript(u);
      if (window.L) return window.L;
    } catch (err) {
      /* try next */
    }
  }
  throw new Error("Leaflet failed to load");
}

class AdsbGlobeCard extends HTMLElement {
  static getStubConfig() {
    return {
      title: "Airspace",
      map: "dark",
      show_labels: true,
      show_trails: true,
      show_range_rings: true,
      show_ground: false,
      alert: { enabled: true, radius_nm: 15, on: ["military", "helicopter", "chinook", "apache", "police", "fighter", "emergency"] },
    };
  }

  static getConfigForm() {
    return {
      schema: [
        { name: "title", selector: { text: {} } },
        { name: "map", selector: { select: { options: ["dark", "light", "streets", "osm", "sat", "terrain"], mode: "dropdown" } } },
        { name: "show_labels", selector: { boolean: {} } },
        { name: "show_trails", selector: { boolean: {} } },
        { name: "show_range_rings", selector: { boolean: {} } },
        { name: "show_ground", selector: { boolean: {} } },
      ],
    };
  }

  setConfig(config) {
    this._config = { map: "dark", show_labels: true, show_trails: true, show_range_rings: true, show_ground: false, ...config };
    this._config.alert = { enabled: true, radius_nm: 15, on: ["military", "helicopter", "chinook", "apache", "police", "fighter", "emergency"], ...(config.alert || {}) };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._build();
  }

  getCardSize() {
    return 9;
  }

  disconnectedCallback() {
    this._gone = true;
    if (this._timer) clearInterval(this._timer);
    if (this._map) {
      this._map.remove();
      this._map = null;
    }
  }

  _home() {
    const c = this._config || {};
    if (typeof c.latitude === "number" && typeof c.longitude === "number") {
      return { lat: c.latitude, lon: c.longitude, name: c.home_name || "Home" };
    }
    const z = this._hass && this._hass.states["zone.home"];
    if (z && z.attributes) {
      return { lat: z.attributes.latitude, lon: z.attributes.longitude, name: z.attributes.friendly_name || "Home" };
    }
    return { lat: 40.6413, lon: -73.7781, name: "Home" };
  }

  async _build() {
    if (this._built) return;
    this._built = true;
    this._markers = new Map();
    this._trails = {};
    this._selected = null;
    this._paused = false;
    this._labels = this._config.show_labels !== false;
    this._tracks = this._config.show_trails !== false;
    this._ground = !!this._config.show_ground;
    this._milOnly = false;
    this._mapId = this._config.map || "dark";
    this._alertInside = new Set();
    this._alertPrimed = false;

    this.innerHTML = "";
    const root = document.createElement("ha-card");
    root.className = "adsb-card";
    root.innerHTML = `
      <style>
        .adsb-card { overflow: hidden; }
        .adsb-head { display:flex; align-items:center; gap:8px; padding:10px 12px 8px; font: 500 14px var(--ha-font-family, Roboto, sans-serif); }
        .adsb-dot { width:8px; height:8px; border-radius:50%; background:#4caf50; box-shadow:0 0 8px #4caf50; }
        .adsb-dot.off { background:#9e9e9e; box-shadow:none; }
        .adsb-meta { margin-left:auto; font-size:12px; font-weight:400; color: var(--secondary-text-color); }
        .adsb-map { height: 460px; width:100%; background:#111; }
        .adsb-tools { display:flex; flex-wrap:wrap; gap:4px; padding:6px 10px 10px; }
        .adsb-tools button { border:1px solid var(--divider-color); background: var(--secondary-background-color, var(--card-background-color)); color: var(--primary-text-color); border-radius:4px; padding:4px 8px; font-size:11px; cursor:pointer; }
        .adsb-tools button.on { border-color: var(--primary-color); background: color-mix(in srgb, var(--primary-color) 18%, transparent); }
        .adsb-info { position:absolute; left:10px; top:10px; z-index:500; background: color-mix(in srgb, var(--card-background-color) 92%, transparent); border:1px solid var(--divider-color); border-radius:6px; padding:8px 10px; min-width:160px; font-size:12px; }
        .adsb-info .cs { font-weight:600; font-size:14px; }
        .adsb-wrap { display:flex; align-items:center; justify-content:center; }
        .adsb-rot { transform-origin: center; }
        .adsb-label { position:absolute; top:100%; left:50%; transform:translate(-50%, 2px); font: 10px/1.2 ui-monospace, monospace; color:#fff; text-shadow:0 1px 2px #000; white-space:nowrap; text-align:center; }
        .leaflet-div-icon.ac-icon { background:transparent; border:0; overflow:visible; }
        .home-pin { width:10px; height:10px; border-radius:50%; background:#03a9f4; border:2px solid #fff; box-shadow:0 0 0 1px #03a9f4; }
      </style>
      <div class="adsb-head">
        <span class="adsb-dot"></span>
        <span class="adsb-title">${this._config.title || "ADS-B Globe"}</span>
        <span class="adsb-meta">connecting</span>
      </div>
      <div style="position:relative">
        <div class="adsb-map"></div>
      </div>
      <div class="adsb-tools"></div>
    `;
    this.appendChild(root);
    this._meta = root.querySelector(".adsb-meta");
    this._dot = root.querySelector(".adsb-dot");
    this._mapEl = root.querySelector(".adsb-map");
    this._tools = root.querySelector(".adsb-tools");
    this._renderTools();

    ensureLeafletCss();
    try {
      await ensureLeaflet();
    } catch (err) {
      this._meta.textContent = "Leaflet failed to load";
      return;
    }
    const L = window.L;
    const home = this._home();
    this._map = L.map(this._mapEl, { zoomControl: true, attributionControl: true, worldCopyJump: true }).setView([home.lat, home.lon], 9);
    this._setTiles(this._mapId);
    this._rings = L.layerGroup().addTo(this._map);
    this._drawRings();
    this._map.on("moveend", () => this._fetch());
    setTimeout(() => this._map.invalidateSize(), 250);
    this._fetch();
    this._timer = setInterval(() => this._fetch(), POLL_MS);
  }

  _renderTools() {
    const maps = Object.keys(MAPS);
    this._tools.innerHTML = "";
    const add = (label, on, fn) => {
      const b = document.createElement("button");
      b.textContent = label;
      if (on) b.classList.add("on");
      b.addEventListener("click", fn);
      this._tools.appendChild(b);
    };
    add("Labels", this._labels, () => { this._labels = !this._labels; this._renderTools(); });
    add("Trail", this._tracks, () => { this._tracks = !this._tracks; this._renderTools(); });
    add("Ground", this._ground, () => { this._ground = !this._ground; this._renderTools(); });
    add("Military", this._milOnly, () => { this._milOnly = !this._milOnly; this._renderTools(); });
    add("Pause", this._paused, () => { this._paused = !this._paused; this._dot.classList.toggle("off", this._paused); this._renderTools(); });
    maps.forEach((id) => add(id[0].toUpperCase() + id.slice(1), this._mapId === id, () => {
      this._mapId = id;
      this._setTiles(id);
      this._renderTools();
    }));
  }

  _setTiles(id) {
    if (!this._map) return;
    if (this._tiles) this._map.removeLayer(this._tiles);
    const spec = MAPS[id] || MAPS.dark;
    this._tiles = window.L.tileLayer(spec.url, { attribution: spec.attr + " · traffic adsb.lol", subdomains: spec.sub || "abc", maxZoom: 18 }).addTo(this._map);
  }

  _drawRings() {
    const L = window.L;
    this._rings.clearLayers();
    const home = this._home();
    L.marker([home.lat, home.lon], {
      interactive: false,
      icon: L.divIcon({ className: "ac-icon", html: '<div class="home-pin"></div>', iconSize: [12, 12], iconAnchor: [6, 6] }),
    }).addTo(this._rings);
    if (this._config.show_range_rings !== false) {
      [25, 50, 100].forEach((nm) => {
        L.circle([home.lat, home.lon], { radius: nm * 1852, color: "#03a9f4", weight: 1, opacity: 0.35, fill: false, interactive: false }).addTo(this._rings);
      });
    }
    const al = this._config.alert;
    if (al && al.enabled !== false) {
      L.circle([home.lat, home.lon], {
        radius: (al.radius_nm || 15) * 1852,
        color: "#ffa726",
        weight: 2,
        opacity: 0.85,
        fillColor: "#ffa726",
        fillOpacity: 0.08,
        dashArray: "6 5",
        interactive: false,
      }).addTo(this._rings);
    }
  }

  _viewDist() {
    const b = this._map.getBounds();
    const c = this._map.getCenter();
    const ne = b.getNorthEast();
    const d = haversineNm(c.lat, c.lng, ne.lat, ne.lng);
    return Math.min(MAX_DIST, Math.max(8, Math.ceil(d * 1.05)));
  }

  _normalizeFeed(data) {
    const ac = (data.ac || data.aircraft || []).map(slim).filter(Boolean);
    return { ac, total: data.total || ac.length, source: data.source || "live" };
  }

  async _fetchPublic(lat, lon, dist) {
    const urls = [
      `https://api.adsb.lol/v2/lat/${lat.toFixed(4)}/lon/${lon.toFixed(4)}/dist/${dist}`,
      `https://opendata.adsb.fi/api/v3/lat/${lat.toFixed(4)}/lon/${lon.toFixed(4)}/dist/${dist}`,
    ];
    for (const url of urls) {
      try {
        const resp = await fetch(url, { headers: { Accept: "application/json" } });
        if (!resp.ok) continue;
        const json = await resp.json();
        json.source = url.split("/")[2];
        return json;
      } catch (err) {
        /* try next */
      }
    }
    return null;
  }

  async _fetch() {
    if (this._gone || this._paused || this._busy || !this._map) return;
    this._busy = true;
    const c = this._map.getCenter();
    const dist = this._viewDist();
    let data = null;
    try {
      if (this._hass && this._hass.callApi) {
        data = await this._hass.callApi("GET", `adsb_globe/aircraft?lat=${c.lat.toFixed(4)}&lon=${c.lng.toFixed(4)}&dist=${dist}`);
      }
    } catch (err) {
      data = null;
    }
    if (!data || !Array.isArray(data.ac || data.aircraft)) {
      data = await this._fetchPublic(c.lat, c.lng, dist);
    }
    if (data && (data.ac || data.aircraft)) {
      this._paint(this._normalizeFeed(data));
    } else {
      this._meta.textContent = "feed error";
      this._dot.classList.add("off");
    }
    this._busy = false;
  }

  _paint(data) {
    const L = window.L;
    const list = (data.ac || []).filter((a) => {
      if (!this._ground && a.alt === "ground") return false;
      if (this._milOnly && !((a.dbFlags || 0) & 1)) return false;
      return true;
    });
    this._meta.textContent = `${list.length} in view · ${data.source || "live"}`;
    this._dot.classList.remove("off");
    this._runAlerts(list);

    const keep = new Set();
    const bounds = this._map.getBounds().pad(0.08);
    const vis = list.filter((a) => a.hex === this._selected || bounds.contains([a.lat, a.lon]));
    vis.forEach((ac) => {
      keep.add(ac.hex);
      const shape = TYPE_SHAPE[(ac.t || "").toUpperCase()] || (ac.category === "A7" ? "heli" : "unknown");
      const def = SHAPES[shape];
      const color = ["7500", "7600", "7700"].includes(ac.squawk) ? "#ef5350" : altColor(ac.alt);
      const sel = ac.hex === this._selected;
      const rot = ac.track || 0;
      const size = sel ? 34 : 26;
      const label = this._labels || sel
        ? `<div class="adsb-label">${callsign(ac)} ${ac.alt === "ground" ? "gnd" : (ac.alt != null ? Math.round(ac.alt) : "")}</div>`
        : "";
      const html = `<div class="adsb-wrap" style="width:${size}px;height:${size}px">
        <div class="adsb-rot" style="transform:rotate(${rot}deg)">
          <svg viewBox="${def.vb}" width="${size}" height="${size}"><path d="${def.d}" fill="${color}" stroke="${sel ? "#fff" : "#111}" stroke-width="1.2"/></svg>
        </div>${label}</div>`;
      const existing = this._markers.get(ac.hex);
      if (existing) {
        existing.setLatLng([ac.lat, ac.lon]);
        const rotEl = existing.getElement() && existing.getElement().querySelector(".adsb-rot");
        if (rotEl) rotEl.style.transform = `rotate(${rot}deg)`;
        else existing.setIcon(L.divIcon({ className: "ac-icon", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }));
        existing.setZIndexOffset(sel ? 800 : 0);
      } else {
        const mk = L.marker([ac.lat, ac.lon], {
          icon: L.divIcon({ className: "ac-icon", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
          riseOnHover: true,
        }).addTo(this._map);
        mk.on("click", () => {
          this._selected = this._selected === ac.hex ? null : ac.hex;
          this._info(ac);
        });
        this._markers.set(ac.hex, mk);
      }
      if (this._tracks && sel) {
        const trail = this._trails[ac.hex] || [];
        const last = trail[trail.length - 1];
        if (!last || haversineNm(last[0], last[1], ac.lat, ac.lon) > 0.02) {
          trail.push([ac.lat, ac.lon]);
          if (trail.length > MAX_TRAIL) trail.shift();
          this._trails[ac.hex] = trail;
        }
      }
    });
    for (const [hex, mk] of this._markers) {
      if (!keep.has(hex)) {
        this._map.removeLayer(mk);
        this._markers.delete(hex);
      }
    }
    if (this._line) {
      this._map.removeLayer(this._line);
      this._line = null;
    }
    if (this._tracks && this._selected && this._trails[this._selected] && this._trails[this._selected].length >= 2) {
      this._line = L.polyline(this._trails[this._selected], { color: "#80cbc4", weight: 2.2, opacity: 0.95, interactive: false }).addTo(this._map);
    }
    if (this._selected) {
      const ac = vis.find((a) => a.hex === this._selected);
      if (ac) this._info(ac);
    }
  }

  _info(ac) {
    let box = this.querySelector(".adsb-info");
    if (!this._selected) {
      if (box) box.remove();
      return;
    }
    if (!box) {
      box = document.createElement("div");
      box.className = "adsb-info";
      this._mapEl.parentElement.appendChild(box);
    }
    const alt = ac.alt === "ground" ? "ground" : ac.alt != null ? `${Math.round(ac.alt)} ft` : "n/a";
    const spd = ac.gs != null ? `${Math.round(ac.gs)} kt` : "n/a";
    box.innerHTML = `<div class="cs">${callsign(ac)}</div>
      <div>${ac.t || "type ?"} · ${ac.r || ac.hex}</div>
      <div>${alt} · ${spd} · ${ac.track != null ? Math.round(ac.track) + "°" : ""}</div>
      <div>sqk ${ac.squawk || "—"} · ${classify(ac).join(", ") || "civil"}</div>`;
  }

  _runAlerts(list) {
    const al = this._config.alert;
    if (!al || al.enabled === false) return;
    const home = this._home();
    const r = al.radius_nm || 15;
    const want = new Set(al.on || []);
    const inside = new Set();
    for (const ac of list) {
      const d = haversineNm(home.lat, home.lon, ac.lat, ac.lon);
      if (d > r) continue;
      inside.add(ac.hex);
      if (!this._alertPrimed) continue;
      if (this._alertInside.has(ac.hex)) continue;
      const kinds = classify(ac).filter((k) => want.has(k));
      if (!kinds.length) continue;
      this.dispatchEvent(new CustomEvent("hass-notification", { bubbles: true, composed: true, detail: { message: `${callsign(ac)} ${kinds.join(", ")} ${d.toFixed(1)} NM` } }));
    }
    this._alertInside = inside;
    this._alertPrimed = true;
  }
}

if (!customElements.get("adsb-globe-card")) {
  customElements.define("adsb-globe-card", AdsbGlobeCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "adsb-globe-card")) {
  window.customCards.push({
    type: "adsb-globe-card",
    name: "ADS-B Globe",
    description: "Live aircraft map (tar1090 / ADS-B Exchange style).",
    preview: true,
    documentationURL: "https://github.com/OnChainPunk/ha-adsb-globe",
  });
}

console.info(`%c ADS-B Globe %c ${CARD_VERSION} `, "background:#03a9f4;color:#000;padding:2px 4px", "background:transparent;color:#03a9f4");
