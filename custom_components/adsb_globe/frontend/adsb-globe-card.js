const CARD_VERSION = "1.1.2";
const POLL_MS = 2000;
const MAX_DIST = 250;
const MAX_TRAIL = 64;
const LEAFLET_CSS = "/adsb_globe/leaflet.css";
const LEAFLET_CSS_CDN = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "/adsb_globe/leaflet.js";
const LEAFLET_JS_CDN = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

const MAPS = {
  osm: { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "© OpenStreetMap" },
  streets: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", attr: "Tiles © Esri" },
  dark: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", attr: "Tiles © Esri" },
  sat: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "Tiles © Esri" },
  terrain: { url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attr: "© OSM © OpenTopoMap", sub: "abc" },
};

const PLANE_PATH = "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z";

const TYPE_SHAPE = {};
["A319","A320","A321","A20N","A21N","B737","B738","B739","B38M","B39M","B77W","B789","B788","A333","A359"].forEach((t) => { TYPE_SHAPE[t] = "airliner"; });
["H47","CH47","CH47D","CH47F","H64","AH64","AH64D","H60","UH60","A139","EC35","EC45","B06","R44","R22","S92","A109"].forEach((t) => { TYPE_SHAPE[t] = "heli"; });
["F16","F16C","F18","F22","F35","F35A","F15","A10","EUFI","TYPH","RAFA"].forEach((t) => { TYPE_SHAPE[t] = "fighter"; });

function altColor(alt) {
  if (alt == null) return "#9e9e9e";
  if (alt === "ground") return "#8d6e63";
  const t = Math.max(0, Math.min(1, alt / 40000));
  return `hsl(${(1 - t) * 240}, 90%, 58%)`;
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
  const lat = Number(raw.lat);
  const lon = Number(raw.lon);
  if (!hex || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
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
    lat,
    lon,
    seen: raw.seen || 0,
    dbFlags: raw.dbFlags || 0,
    emergency: raw.emergency && raw.emergency !== "none" ? raw.emergency : "",
    dst: raw.dst,
  };
}

let leafletLoader = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (window.L) return resolve(window.L);
      existing.addEventListener("load", () => resolve(window.L));
      existing.addEventListener("error", reject);
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.onload = () => (window.L ? resolve(window.L) : reject(new Error("no L")));
    el.onerror = reject;
    document.head.appendChild(el);
  });
}

function ensureLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoader) return leafletLoader;
  leafletLoader = (async () => {
    try {
      await loadScript(LEAFLET_JS);
      if (window.L) return window.L;
    } catch (err) { /* cdn */ }
    await loadScript(LEAFLET_JS_CDN);
    if (!window.L) throw new Error("Leaflet failed to load");
    return window.L;
  })();
  return leafletLoader;
}

class AdsbGlobeCard extends HTMLElement {
  static getStubConfig(hass) {
    const states = (hass && hass.states) || {};
    const entity = Object.keys(states).find((id) => Array.isArray(states[id]?.attributes?.aircraft)) || "";
    return { entity, title: "Airspace", map: "osm", show_labels: true, show_trails: true, show_range_rings: true, show_ground: false };
  }

  static getConfigForm() {
    return {
      schema: [
        { name: "title", selector: { text: {} } },
        { name: "map", selector: { select: { options: Object.keys(MAPS), mode: "dropdown" } } },
        { name: "show_labels", selector: { boolean: {} } },
        { name: "show_trails", selector: { boolean: {} } },
        { name: "show_range_rings", selector: { boolean: {} } },
        { name: "show_ground", selector: { boolean: {} } },
      ],
    };
  }

  setConfig(config) {
    this._config = { map: "osm", show_labels: true, show_trails: true, show_range_rings: true, show_ground: false, ...config };
    this._config.alert = {
      enabled: true,
      radius_nm: 15,
      on: ["military", "helicopter", "chinook", "apache", "police", "fighter", "emergency"],
      ...(config.alert || {}),
    };
    if (this.shadowRoot) this._renderShell();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot) return;
    if (!this._map) this._ensureMap();
    else if (this._config && this._config.entity) this._paintEntity();
    else if (this._config && this._config.entity) this._paintEntity();
  }

  getCardSize() {
    return 8;
  }

  getLayoutOptions() {
    return { grid_rows: 6, grid_columns: 4, grid_min_rows: 4, grid_min_columns: 2 };
  }

  connectedCallback() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._gone = false;
    this._renderShell();
    this._ensureMap();
  }

  disconnectedCallback() {
    this._gone = true;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    if (this._ro) {
      this._ro.disconnect();
      this._ro = null;
    }
    if (this._map) {
      try { this._map.remove(); } catch (err) { /* ignore */ }
      this._map = null;
    }
    const mapEl = this.shadowRoot && this.shadowRoot.getElementById("map");
    if (mapEl) {
      if (mapEl._leaflet_id) delete mapEl._leaflet_id;
      mapEl.innerHTML = "";
    }
  }

  _$(sel) {
    return this.shadowRoot ? this.shadowRoot.querySelector(sel) : null;
  }

  _styles() {
    return `
      :host { display: block; }
      ha-card { overflow: hidden; }
      .head { display:flex; align-items:center; gap:8px; padding:10px 12px 8px; font: 500 14px var(--ha-font-family, Roboto, sans-serif); color: var(--primary-text-color); }
      .dot { width:8px; height:8px; border-radius:50%; background:#4caf50; box-shadow:0 0 8px #4caf50; flex-shrink:0; }
      .dot.off { background:#9e9e9e; box-shadow:none; }
      .meta { margin-left:auto; font-size:12px; font-weight:400; color: var(--secondary-text-color); }
      .gear { border:1px solid var(--divider-color); background:transparent; color:var(--primary-text-color); border-radius:4px; width:28px; height:28px; cursor:pointer; flex-shrink:0; }
      .map-wrap { position: relative; width: 100%; height: 420px; overflow: hidden; isolation: isolate; z-index: 0; background: #1a1a1a; }
      #map { width: 100%; height: 100%; z-index: 0; }
      .leaflet-container { width: 100% !important; height: 100% !important; background: #1a1a1a; font: 12px/1.5 sans-serif; overflow: hidden !important; }
      .leaflet-container img, .leaflet-container img.leaflet-tile { max-width: none !important; max-height: none !important; width: 256px; height: 256px; }
      .leaflet-pane, .leaflet-tile, .leaflet-marker-icon, .leaflet-marker-shadow, .leaflet-tile-container,
      .leaflet-pane > svg, .leaflet-pane > canvas, .leaflet-zoom-box, .leaflet-image-layer, .leaflet-layer { position: absolute; left: 0; top: 0; }
      .leaflet-tile { visibility: hidden; }
      .leaflet-tile-loaded { visibility: inherit; }
      .leaflet-marker-icon, .leaflet-marker-shadow { display: block; }
      .leaflet-div-icon { background: transparent; border: 0; }
      .leaflet-tile-pane { z-index: 200; }
      .leaflet-overlay-pane { z-index: 400; }
      .leaflet-marker-pane { z-index: 600; }
      .leaflet-tooltip-pane { z-index: 650; }
      .leaflet-popup-pane { z-index: 700; }
      .leaflet-map-pane { z-index: 1; }
      .leaflet-control { position: relative; z-index: 800; pointer-events: auto; }
      .leaflet-top, .leaflet-bottom { position: absolute; z-index: 1000; pointer-events: none; }
      .leaflet-top { top: 0; } .leaflet-bottom { bottom: 0; } .leaflet-left { left: 0; } .leaflet-right { right: 0; }
      .leaflet-top .leaflet-control { margin-top: 10px; } .leaflet-bottom .leaflet-control { margin-bottom: 10px; }
      .leaflet-left .leaflet-control { margin-left: 10px; } .leaflet-right .leaflet-control { margin-right: 10px; }
      .leaflet-bar { box-shadow: 0 1px 5px rgba(0,0,0,.4); border-radius: 4px; }
      .leaflet-bar a { background:#fff; border-bottom:1px solid #ccc; width:26px; height:26px; line-height:26px; display:block; text-align:center; text-decoration:none; color:#000; }
      .leaflet-control-attribution { background: rgba(255,255,255,.9); color:#333; font-size:11px; max-width: calc(100% - 10px); }
      .settings { display:none; position:absolute; right:10px; top:10px; z-index:2000; width:250px; background: color-mix(in srgb, var(--card-background-color) 94%, transparent); border:1px solid var(--divider-color); border-radius:8px; padding:12px; font-size:13px; color: var(--primary-text-color); }
      .settings.open { display:block; }
      .settings h3 { margin:0 0 8px; font-size:14px; }
      .settings label { display:flex; align-items:center; justify-content:space-between; gap:8px; margin:8px 0; }
      .settings input[type=range] { width:120px; }
      .settings .hint { color:var(--secondary-text-color); font-size:11px; }
      .tools { display:flex; flex-wrap:wrap; gap:4px; padding:8px 10px 10px; position: relative; z-index: 2; }
      .tools button { border:1px solid var(--divider-color); background: var(--secondary-background-color, var(--card-background-color)); color: var(--primary-text-color); border-radius:4px; padding:4px 8px; font-size:11px; cursor:pointer; }
      .tools button.on { border-color: var(--primary-color); background: color-mix(in srgb, var(--primary-color) 18%, transparent); }
      .info { position:absolute; left:10px; top:10px; z-index:1500; background: color-mix(in srgb, var(--card-background-color) 92%, transparent); border:1px solid var(--divider-color); border-radius:6px; padding:8px 10px; min-width:160px; font-size:12px; color: var(--primary-text-color); }
      .info .cs { font-weight:600; font-size:14px; }
      .ac-marker { display:flex; align-items:center; justify-content:center; transform-origin: center; }
      .ac-label { position:absolute; top:100%; left:50%; transform:translate(-50%, 2px); font: 10px/1.2 ui-monospace, monospace; color:#fff; text-shadow:0 1px 2px #000; white-space:nowrap; text-align:center; pointer-events:none; }
      .home-pin { width:10px; height:10px; border-radius:50%; background:#03a9f4; border:2px solid #fff; box-shadow:0 0 0 1px #03a9f4; }
    `;
  }

  _renderShell() {
    if (!this.shadowRoot || !this._config) return;
    if (this.shadowRoot.getElementById("map") && this._map) return;
    const title = this._config.title || "ADS-B Globe";
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="${LEAFLET_CSS}">
      <link rel="stylesheet" href="${LEAFLET_CSS_CDN}">
      <style>${this._styles()}</style>
      <ha-card>
        <div class="head">
          <span class="dot"></span>
          <span class="title">${title}</span>
          <span class="meta">connecting</span>
          <button type="button" class="gear" title="Settings">⚙</button>
        </div>
        <div class="map-wrap">
          <div id="map"></div>
          <div class="settings">
            <h3>Settings</h3>
            <label>Alert range <span class="range-val">15</span> NM
              <input type="range" class="range" min="5" max="80" step="1" value="15">
            </label>
            <label>Notifications
              <input type="checkbox" class="notify" checked>
            </label>
            <label>Range rings
              <input type="checkbox" class="rings" checked>
            </label>
            <div class="hint">Range and notifications save to the integration.</div>
          </div>
        </div>
        <div class="tools"></div>
      </ha-card>
    `;
    this._meta = this._$(".meta");
    this._dot = this._$(".dot");
    this._mapEl = this.shadowRoot.getElementById("map");
    this._tools = this._$(".tools");
    this._settingsEl = this._$(".settings");
    this._bindSettings();
    this._labels = this._config.show_labels !== false;
    this._tracks = this._config.show_trails !== false;
    this._ground = !!this._config.show_ground;
    this._milOnly = false;
    this._paused = false;
    this._mapId = this._config.map && MAPS[this._config.map] ? this._config.map : "osm";
    this._renderTools();
  }

  _bindSettings() {
    const gear = this._$(".gear");
    const panel = this._settingsEl;
    if (!gear || !panel) return;
    const range = panel.querySelector(".range");
    const rangeVal = panel.querySelector(".range-val");
    const notify = panel.querySelector(".notify");
    const rings = panel.querySelector(".rings");
    const apply = () => {
      range.value = String(this._radiusNm());
      rangeVal.textContent = String(this._radiusNm());
      notify.checked = this._notifyOn();
      rings.checked = this._config.show_range_rings !== false;
    };
    apply();
    gear.addEventListener("click", (ev) => {
      ev.stopPropagation();
      apply();
      panel.classList.toggle("open");
    });
    range.addEventListener("input", () => { rangeVal.textContent = range.value; });
    const save = () => {
      const radius = Number(range.value);
      this._config.alert = { ...(this._config.alert || {}), radius_nm: radius, enabled: notify.checked };
      this._config.show_range_rings = rings.checked;
      this._drawRings();
      if (this._hass && this._hass.callService) {
        this._hass.callService("adsb_globe", "set_options", { radius_nm: radius, notify: notify.checked });
      }
    };
    range.addEventListener("change", save);
    notify.addEventListener("change", save);
    rings.addEventListener("change", () => {
      this._config.show_range_rings = rings.checked;
      this._drawRings();
    });
  }

  _renderTools() {
    if (!this._tools) return;
    this._tools.innerHTML = "";
    const add = (label, on, fn) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      if (on) b.classList.add("on");
      b.addEventListener("click", (ev) => { ev.preventDefault(); fn(); });
      this._tools.appendChild(b);
    };
    add("Labels", this._labels, () => { this._labels = !this._labels; this._renderTools(); });
    add("Trail", this._tracks, () => { this._tracks = !this._tracks; this._renderTools(); });
    add("Ground", this._ground, () => { this._ground = !this._ground; this._renderTools(); });
    add("Military", this._milOnly, () => { this._milOnly = !this._milOnly; this._renderTools(); });
    add("Pause", this._paused, () => {
      this._paused = !this._paused;
      if (this._dot) this._dot.classList.toggle("off", this._paused);
      this._renderTools();
    });
    Object.keys(MAPS).forEach((id) => add(id[0].toUpperCase() + id.slice(1), this._mapId === id, () => {
      this._mapId = id;
      this._setTiles(id);
      this._renderTools();
    }));
  }

  async _ensureMap() {
    if (this._gone || this._map || this._mapInit) return;
    if (!this._mapEl || !this._hass) return;
    this._mapInit = true;
    try {
      await ensureLeaflet();
    } catch (err) {
      if (this._meta) this._meta.textContent = "Leaflet failed to load";
      this._mapInit = false;
      return;
    }
    if (this._gone || !this._mapEl) return;
    const L = window.L;
    const home = this._home();
    this._map = L.map(this._mapEl, {
      zoomControl: true,
      attributionControl: true,
      worldCopyJump: true,
    }).setView([home.lat, home.lon], 9);
    this._setTiles(this._mapId);
    this._rings = L.layerGroup().addTo(this._map);
    this._markers = new Map();
    this._trails = {};
    this._selected = null;
    this._alertInside = new Set();
    this._alertPrimed = false;
    this._drawRings();
    this._map.on("moveend", () => this._fetch());
    const wrap = this._$(".map-wrap");
    this._ro = new ResizeObserver(() => {
      if (this._map) this._map.invalidateSize();
    });
    if (wrap) this._ro.observe(wrap);
    requestAnimationFrame(() => this._map && this._map.invalidateSize());
    setTimeout(() => this._map && this._map.invalidateSize(), 300);
    this._fetch();
    this._timer = setInterval(() => this._fetch(), POLL_MS);
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

  _setTiles(id) {
    if (!this._map || !window.L) return;
    if (this._tiles) this._map.removeLayer(this._tiles);
    const spec = MAPS[id] || MAPS.osm;
    const opts = { attribution: spec.attr + " · traffic adsb.lol", maxZoom: 18, referrerPolicy: "strict-origin-when-cross-origin" };
    if (spec.sub) opts.subdomains = spec.sub;
    this._tiles = window.L.tileLayer(spec.url, opts).addTo(this._map);
  }

  _drawRings() {
    if (!this._rings || !window.L) return;
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
    L.circle([home.lat, home.lon], {
      radius: this._radiusNm() * 1852,
      color: "#ffa726",
      weight: 2,
      opacity: 0.85,
      fillColor: "#ffa726",
      fillOpacity: 0.08,
      dashArray: "6 5",
      interactive: false,
    }).addTo(this._rings);
  }

  _viewDist() {
    const b = this._map.getBounds();
    const c = this._map.getCenter();
    const ne = b.getNorthEast();
    return Math.min(MAX_DIST, Math.max(8, Math.ceil(haversineNm(c.lat, c.lng, ne.lat, ne.lng) * 1.05)));
  }

  _entityState() {
    const id = this._config && this._config.entity;
    return (id && this._hass && this._hass.states[id]) || null;
  }

  _radiusNm() {
    const st = this._entityState();
    if (st && st.attributes.radius_nm) return Number(st.attributes.radius_nm) || 15;
    return (this._config.alert && this._config.alert.radius_nm) || 15;
  }

  _notifyOn() {
    const st = this._entityState();
    if (st && st.attributes.notify != null) return !!st.attributes.notify;
    const al = this._config.alert;
    return !al || al.enabled !== false;
  }

  _paintEntity() {
    const st = this._entityState();
    if (st && Array.isArray(st.attributes.aircraft) && !this._busy) {
      this._paint({ ac: st.attributes.aircraft.map(slim).filter(Boolean), source: "ha" });
    }
  }

  async _fetch() {
    if (this._gone || this._paused || this._busy || !this._map) return;
    this._busy = true;
    const c = this._map.getCenter();
    const dist = this._viewDist();
    let data = null;
    try {
      if (this._hass && this._hass.callApi) {
        data = await Promise.race([
          this._hass.callApi("GET", `adsb_globe/aircraft?lat=${c.lat.toFixed(4)}&lon=${c.lng.toFixed(4)}&dist=${dist}`),
          new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 7000)),
        ]);
      }
    } catch (err) {
      data = null;
    }
    if (!data || !Array.isArray(data.ac || data.aircraft)) {
      const st = this._entityState();
      if (st && Array.isArray(st.attributes.aircraft)) {
        data = { ac: st.attributes.aircraft, source: "ha" };
      }
    }
    if (data && (data.ac || data.aircraft)) {
      const ac = (data.ac || data.aircraft).map(slim).filter(Boolean);
      this._paint({ ac, source: data.source || "live" });
    } else if (this._meta) {
      this._meta.textContent = "feed error";
      if (this._dot) this._dot.classList.add("off");
    }
    this._busy = false;
  }

  _iconHtml(ac, sel) {
    const size = sel ? 36 : 28;
    const rot = ac.track || 0;
    const color = ["7500", "7600", "7700"].includes(ac.squawk) ? "#ef5350" : altColor(ac.alt);
    const label = this._labels || sel
      ? `<div class="ac-label">${callsign(ac)} ${ac.alt === "ground" ? "gnd" : (ac.alt != null ? Math.round(ac.alt) : "")}</div>`
      : "";
    return {
      size,
      html: `<div class="ac-marker" style="width:${size}px;height:${size}px;transform:rotate(${rot}deg)">
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${PLANE_PATH}" fill="${color}" stroke="${sel ? "#fff" : "#111"}" stroke-width="0.6"/></svg>
      </div>${label}`,
    };
  }

  _paint(data) {
    const L = window.L;
    if (!this._map || !L) return;
    const list = (data.ac || []).filter((a) => {
      if (!this._ground && a.alt === "ground") return false;
      if (this._milOnly && !((a.dbFlags || 0) & 1)) return false;
      return Number.isFinite(a.lat) && Number.isFinite(a.lon);
    });
    if (this._meta) this._meta.textContent = `${list.length} in view · ${data.source || "live"}`;
    if (this._dot) this._dot.classList.remove("off");
    this._runAlerts(list);

    const keep = new Set();
    list.forEach((ac) => {
      keep.add(ac.hex);
      const sel = ac.hex === this._selected;
      const { size, html } = this._iconHtml(ac, sel);
      const existing = this._markers.get(ac.hex);
      if (existing) {
        existing.setLatLng([ac.lat, ac.lon]);
        const el = existing.getElement();
        const mk = el && el.querySelector(".ac-marker");
        if (mk) mk.style.transform = `rotate(${ac.track || 0}deg)`;
        else existing.setIcon(L.divIcon({ className: "ac-icon", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }));
        existing.setZIndexOffset(sel ? 800 : 0);
      } else {
        const marker = L.marker([ac.lat, ac.lon], {
          icon: L.divIcon({ className: "ac-icon", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
          riseOnHover: true,
        }).addTo(this._map);
        marker.on("click", () => {
          this._selected = this._selected === ac.hex ? null : ac.hex;
          this._info(ac);
        });
        this._markers.set(ac.hex, marker);
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
      const ac = list.find((a) => a.hex === this._selected);
      if (ac) this._info(ac);
    }
  }

  _info(ac) {
    let box = this._$(".info");
    if (!this._selected) {
      if (box) box.remove();
      return;
    }
    if (!box) {
      box = document.createElement("div");
      box.className = "info";
      const wrap = this._$(".map-wrap");
      if (wrap) wrap.appendChild(box);
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
    if (!al || al.enabled === false || !this._notifyOn()) return;
    const home = this._home();
    const r = this._radiusNm();
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
    description: "Live aircraft map around your home, with in-radius alerts.",
    preview: false,
    documentationURL: "https://github.com/OnChainPunk/ha-adsb-globe",
  });
}

console.info(`%c ADS-B Globe %c ${CARD_VERSION} `, "background:#03a9f4;color:#000;padding:2px 4px", "background:transparent;color:#03a9f4");
