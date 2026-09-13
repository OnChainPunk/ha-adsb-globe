const CARD_VERSION = "1.2.0";
const POLL_MS = 1000;
const MAX_DIST = 250;
const MAX_TRAIL = 64;
const LEAFLET_JS = "/adsb_globe/leaflet.js";
const LEAFLET_JS_CDN = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS_INLINE = `/* required styles */

.leaflet-pane,
.leaflet-tile,
.leaflet-marker-icon,
.leaflet-marker-shadow,
.leaflet-tile-container,
.leaflet-pane > svg,
.leaflet-pane > canvas,
.leaflet-zoom-box,
.leaflet-image-layer,
.leaflet-layer {
	position: absolute;
	left: 0;
	top: 0;
	}
.leaflet-container {
	overflow: hidden;
	}
.leaflet-tile,
.leaflet-marker-icon,
.leaflet-marker-shadow {
	-webkit-user-select: none;
	   -moz-user-select: none;
	        user-select: none;
	  -webkit-user-drag: none;
	}
/* Prevents IE11 from highlighting tiles in blue */
.leaflet-tile::selection {
	background: transparent;
}
/* Safari renders non-retina tile on retina better with this, but Chrome is worse */
.leaflet-safari .leaflet-tile {
	image-rendering: -webkit-optimize-contrast;
	}
/* hack that prevents hw layers "stretching" when loading new tiles */
.leaflet-safari .leaflet-tile-container {
	width: 1600px;
	height: 1600px;
	-webkit-transform-origin: 0 0;
	}
.leaflet-marker-icon,
.leaflet-marker-shadow {
	display: block;
	}
/* .leaflet-container svg: reset svg max-width decleration shipped in Joomla! (joomla.org) 3.x */
/* .leaflet-container img: map is broken in FF if you have max-width: 100% on tiles */
.leaflet-container .leaflet-overlay-pane svg {
	max-width: none !important;
	max-height: none !important;
	}
.leaflet-container .leaflet-marker-pane img,
.leaflet-container .leaflet-shadow-pane img,
.leaflet-container .leaflet-tile-pane img,
.leaflet-container img.leaflet-image-layer,
.leaflet-container .leaflet-tile {
	max-width: none !important;
	max-height: none !important;
	width: auto;
	padding: 0;
	}

.leaflet-container img.leaflet-tile {
	/* See: https://bugs.chromium.org/p/chromium/issues/detail?id=600120 */
	mix-blend-mode: plus-lighter;
}

.leaflet-container.leaflet-touch-zoom {
	-ms-touch-action: pan-x pan-y;
	touch-action: pan-x pan-y;
	}
.leaflet-container.leaflet-touch-drag {
	-ms-touch-action: pinch-zoom;
	/* Fallback for FF which doesn't support pinch-zoom */
	touch-action: none;
	touch-action: pinch-zoom;
}
.leaflet-container.leaflet-touch-drag.leaflet-touch-zoom {
	-ms-touch-action: none;
	touch-action: none;
}
.leaflet-container {
	-webkit-tap-highlight-color: transparent;
}
.leaflet-container a {
	-webkit-tap-highlight-color: rgba(51, 181, 229, 0.4);
}
.leaflet-tile {
	filter: inherit;
	visibility: hidden;
	}
.leaflet-tile-loaded {
	visibility: inherit;
	}
.leaflet-zoom-box {
	width: 0;
	height: 0;
	-moz-box-sizing: border-box;
	     box-sizing: border-box;
	z-index: 800;
	}
/* workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=888319 */
.leaflet-overlay-pane svg {
	-moz-user-select: none;
	}

.leaflet-pane         { z-index: 400; }

.leaflet-tile-pane    { z-index: 200; }
.leaflet-overlay-pane { z-index: 400; }
.leaflet-shadow-pane  { z-index: 500; }
.leaflet-marker-pane  { z-index: 600; }
.leaflet-tooltip-pane   { z-index: 650; }
.leaflet-popup-pane   { z-index: 700; }

.leaflet-map-pane canvas { z-index: 100; }
.leaflet-map-pane svg    { z-index: 200; }

.leaflet-vml-shape {
	width: 1px;
	height: 1px;
	}
.lvml {
	behavior: url(#default#VML);
	display: inline-block;
	position: absolute;
	}


/* control positioning */

.leaflet-control {
	position: relative;
	z-index: 800;
	pointer-events: visiblePainted; /* IE 9-10 doesn't have auto */
	pointer-events: auto;
	}
.leaflet-top,
.leaflet-bottom {
	position: absolute;
	z-index: 1000;
	pointer-events: none;
	}
.leaflet-top {
	top: 0;
	}
.leaflet-right {
	right: 0;
	}
.leaflet-bottom {
	bottom: 0;
	}
.leaflet-left {
	left: 0;
	}
.leaflet-control {
	float: left;
	clear: both;
	}
.leaflet-right .leaflet-control {
	float: right;
	}
.leaflet-top .leaflet-control {
	margin-top: 10px;
	}
.leaflet-bottom .leaflet-control {
	margin-bottom: 10px;
	}
.leaflet-left .leaflet-control {
	margin-left: 10px;
	}
.leaflet-right .leaflet-control {
	margin-right: 10px;
	}


/* zoom and fade animations */

.leaflet-fade-anim .leaflet-popup {
	opacity: 0;
	-webkit-transition: opacity 0.2s linear;
	   -moz-transition: opacity 0.2s linear;
	        transition: opacity 0.2s linear;
	}
.leaflet-fade-anim .leaflet-map-pane .leaflet-popup {
	opacity: 1;
	}
.leaflet-zoom-animated {
	-webkit-transform-origin: 0 0;
	    -ms-transform-origin: 0 0;
	        transform-origin: 0 0;
	}
svg.leaflet-zoom-animated {
	will-change: transform;
}

.leaflet-zoom-anim .leaflet-zoom-animated {
	-webkit-transition: -webkit-transform 0.25s cubic-bezier(0,0,0.25,1);
	   -moz-transition:    -moz-transform 0.25s cubic-bezier(0,0,0.25,1);
	        transition:         transform 0.25s cubic-bezier(0,0,0.25,1);
	}
.leaflet-zoom-anim .leaflet-tile,
.leaflet-pan-anim .leaflet-tile {
	-webkit-transition: none;
	   -moz-transition: none;
	        transition: none;
	}

.leaflet-zoom-anim .leaflet-zoom-hide {
	visibility: hidden;
	}


/* cursors */

.leaflet-interactive {
	cursor: pointer;
	}
.leaflet-grab {
	cursor: -webkit-grab;
	cursor:    -moz-grab;
	cursor:         grab;
	}
.leaflet-crosshair,
.leaflet-crosshair .leaflet-interactive {
	cursor: crosshair;
	}
.leaflet-popup-pane,
.leaflet-control {
	cursor: auto;
	}
.leaflet-dragging .leaflet-grab,
.leaflet-dragging .leaflet-grab .leaflet-interactive,
.leaflet-dragging .leaflet-marker-draggable {
	cursor: move;
	cursor: -webkit-grabbing;
	cursor:    -moz-grabbing;
	cursor:         grabbing;
	}

/* marker & overlays interactivity */
.leaflet-marker-icon,
.leaflet-marker-shadow,
.leaflet-image-layer,
.leaflet-pane > svg path,
.leaflet-tile-container {
	pointer-events: none;
	}

.leaflet-marker-icon.leaflet-interactive,
.leaflet-image-layer.leaflet-interactive,
.leaflet-pane > svg path.leaflet-interactive,
svg.leaflet-image-layer.leaflet-interactive path {
	pointer-events: visiblePainted; /* IE 9-10 doesn't have auto */
	pointer-events: auto;
	}

/* visual tweaks */

.leaflet-container {
	background: #ddd;
	outline-offset: 1px;
	}
.leaflet-container a {
	color: #0078A8;
	}
.leaflet-zoom-box {
	border: 2px dotted #38f;
	background: rgba(255,255,255,0.5);
	}


/* general typography */
.leaflet-container {
	font-family: "Helvetica Neue", Arial, Helvetica, sans-serif;
	font-size: 12px;
	font-size: 0.75rem;
	line-height: 1.5;
	}


/* general toolbar styles */

.leaflet-bar {
	box-shadow: 0 1px 5px rgba(0,0,0,0.65);
	border-radius: 4px;
	}
.leaflet-bar a {
	background-color: #fff;
	border-bottom: 1px solid #ccc;
	width: 26px;
	height: 26px;
	line-height: 26px;
	display: block;
	text-align: center;
	text-decoration: none;
	color: black;
	}
.leaflet-bar a,
.leaflet-control-layers-toggle {
	background-position: 50% 50%;
	background-repeat: no-repeat;
	display: block;
	}
.leaflet-bar a:hover,
.leaflet-bar a:focus {
	background-color: #f4f4f4;
	}
.leaflet-bar a:first-child {
	border-top-left-radius: 4px;
	border-top-right-radius: 4px;
	}
.leaflet-bar a:last-child {
	border-bottom-left-radius: 4px;
	border-bottom-right-radius: 4px;
	border-bottom: none;
	}
.leaflet-bar a.leaflet-disabled {
	cursor: default;
	background-color: #f4f4f4;
	color: #bbb;
	}

.leaflet-touch .leaflet-bar a {
	width: 30px;
	height: 30px;
	line-height: 30px;
	}
.leaflet-touch .leaflet-bar a:first-child {
	border-top-left-radius: 2px;
	border-top-right-radius: 2px;
	}
.leaflet-touch .leaflet-bar a:last-child {
	border-bottom-left-radius: 2px;
	border-bottom-right-radius: 2px;
	}

/* zoom control */

.leaflet-control-zoom-in,
.leaflet-control-zoom-out {
	font: bold 18px 'Lucida Console', Monaco, monospace;
	text-indent: 1px;
	}

.leaflet-touch .leaflet-control-zoom-in, .leaflet-touch .leaflet-control-zoom-out  {
	font-size: 22px;
	}


/* layers control */

.leaflet-control-layers {
	box-shadow: 0 1px 5px rgba(0,0,0,0.4);
	background: #fff;
	border-radius: 5px;
	}
.leaflet-control-layers-toggle {
	background-image: url(images/layers.png);
	width: 36px;
	height: 36px;
	}
.leaflet-retina .leaflet-control-layers-toggle {
	background-image: url(images/layers-2x.png);
	background-size: 26px 26px;
	}
.leaflet-touch .leaflet-control-layers-toggle {
	width: 44px;
	height: 44px;
	}
.leaflet-control-layers .leaflet-control-layers-list,
.leaflet-control-layers-expanded .leaflet-control-layers-toggle {
	display: none;
	}
.leaflet-control-layers-expanded .leaflet-control-layers-list {
	display: block;
	position: relative;
	}
.leaflet-control-layers-expanded {
	padding: 6px 10px 6px 6px;
	color: #333;
	background: #fff;
	}
.leaflet-control-layers-scrollbar {
	overflow-y: scroll;
	overflow-x: hidden;
	padding-right: 5px;
	}
.leaflet-control-layers-selector {
	margin-top: 2px;
	position: relative;
	top: 1px;
	}
.leaflet-control-layers label {
	display: block;
	font-size: 13px;
	font-size: 1.08333em;
	}
.leaflet-control-layers-separator {
	height: 0;
	border-top: 1px solid #ddd;
	margin: 5px -10px 5px -6px;
	}

/* Default icon URLs */
.leaflet-default-icon-path { /* used only in path-guessing heuristic, see L.Icon.Default */
	background-image: url(images/marker-icon.png);
	}


/* attribution and scale controls */

.leaflet-container .leaflet-control-attribution {
	background: #fff;
	background: rgba(255, 255, 255, 0.8);
	margin: 0;
	}
.leaflet-control-attribution,
.leaflet-control-scale-line {
	padding: 0 5px;
	color: #333;
	line-height: 1.4;
	}
.leaflet-control-attribution a {
	text-decoration: none;
	}
.leaflet-control-attribution a:hover,
.leaflet-control-attribution a:focus {
	text-decoration: underline;
	}
.leaflet-attribution-flag {
	display: inline !important;
	vertical-align: baseline !important;
	width: 1em;
	height: 0.6669em;
	}
.leaflet-left .leaflet-control-scale {
	margin-left: 5px;
	}
.leaflet-bottom .leaflet-control-scale {
	margin-bottom: 5px;
	}
.leaflet-control-scale-line {
	border: 2px solid #777;
	border-top: none;
	line-height: 1.1;
	padding: 2px 5px 1px;
	white-space: nowrap;
	-moz-box-sizing: border-box;
	     box-sizing: border-box;
	background: rgba(255, 255, 255, 0.8);
	text-shadow: 1px 1px #fff;
	}
.leaflet-control-scale-line:not(:first-child) {
	border-top: 2px solid #777;
	border-bottom: none;
	margin-top: -2px;
	}
.leaflet-control-scale-line:not(:first-child):not(:last-child) {
	border-bottom: 2px solid #777;
	}

.leaflet-touch .leaflet-control-attribution,
.leaflet-touch .leaflet-control-layers,
.leaflet-touch .leaflet-bar {
	box-shadow: none;
	}
.leaflet-touch .leaflet-control-layers,
.leaflet-touch .leaflet-bar {
	border: 2px solid rgba(0,0,0,0.2);
	background-clip: padding-box;
	}


/* popup */

.leaflet-popup {
	position: absolute;
	text-align: center;
	margin-bottom: 20px;
	}
.leaflet-popup-content-wrapper {
	padding: 1px;
	text-align: left;
	border-radius: 12px;
	}
.leaflet-popup-content {
	margin: 13px 24px 13px 20px;
	line-height: 1.3;
	font-size: 13px;
	font-size: 1.08333em;
	min-height: 1px;
	}
.leaflet-popup-content p {
	margin: 17px 0;
	margin: 1.3em 0;
	}
.leaflet-popup-tip-container {
	width: 40px;
	height: 20px;
	position: absolute;
	left: 50%;
	margin-top: -1px;
	margin-left: -20px;
	overflow: hidden;
	pointer-events: none;
	}
.leaflet-popup-tip {
	width: 17px;
	height: 17px;
	padding: 1px;

	margin: -10px auto 0;
	pointer-events: auto;

	-webkit-transform: rotate(45deg);
	   -moz-transform: rotate(45deg);
	    -ms-transform: rotate(45deg);
	        transform: rotate(45deg);
	}
.leaflet-popup-content-wrapper,
.leaflet-popup-tip {
	background: white;
	color: #333;
	box-shadow: 0 3px 14px rgba(0,0,0,0.4);
	}
.leaflet-container a.leaflet-popup-close-button {
	position: absolute;
	top: 0;
	right: 0;
	border: none;
	text-align: center;
	width: 24px;
	height: 24px;
	font: 16px/24px Tahoma, Verdana, sans-serif;
	color: #757575;
	text-decoration: none;
	background: transparent;
	}
.leaflet-container a.leaflet-popup-close-button:hover,
.leaflet-container a.leaflet-popup-close-button:focus {
	color: #585858;
	}
.leaflet-popup-scrolled {
	overflow: auto;
	}

.leaflet-oldie .leaflet-popup-content-wrapper {
	-ms-zoom: 1;
	}
.leaflet-oldie .leaflet-popup-tip {
	width: 24px;
	margin: 0 auto;

	-ms-filter: "progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678)";
	filter: progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678);
	}

.leaflet-oldie .leaflet-control-zoom,
.leaflet-oldie .leaflet-control-layers,
.leaflet-oldie .leaflet-popup-content-wrapper,
.leaflet-oldie .leaflet-popup-tip {
	border: 1px solid #999;
	}


/* div icon */

.leaflet-div-icon {
	background: #fff;
	border: 1px solid #666;
	}


/* Tooltip */
/* Base styles for the element that has a tooltip */
.leaflet-tooltip {
	position: absolute;
	padding: 6px;
	background-color: #fff;
	border: 1px solid #fff;
	border-radius: 3px;
	color: #222;
	white-space: nowrap;
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;
	pointer-events: none;
	box-shadow: 0 1px 3px rgba(0,0,0,0.4);
	}
.leaflet-tooltip.leaflet-interactive {
	cursor: pointer;
	pointer-events: auto;
	}
.leaflet-tooltip-top:before,
.leaflet-tooltip-bottom:before,
.leaflet-tooltip-left:before,
.leaflet-tooltip-right:before {
	position: absolute;
	pointer-events: none;
	border: 6px solid transparent;
	background: transparent;
	content: "";
	}

/* Directions */

.leaflet-tooltip-bottom {
	margin-top: 6px;
}
.leaflet-tooltip-top {
	margin-top: -6px;
}
.leaflet-tooltip-bottom:before,
.leaflet-tooltip-top:before {
	left: 50%;
	margin-left: -6px;
	}
.leaflet-tooltip-top:before {
	bottom: 0;
	margin-bottom: -12px;
	border-top-color: #fff;
	}
.leaflet-tooltip-bottom:before {
	top: 0;
	margin-top: -12px;
	margin-left: -6px;
	border-bottom-color: #fff;
	}
.leaflet-tooltip-left {
	margin-left: -6px;
}
.leaflet-tooltip-right {
	margin-left: 6px;
}
.leaflet-tooltip-left:before,
.leaflet-tooltip-right:before {
	top: 50%;
	margin-top: -6px;
	}
.leaflet-tooltip-left:before {
	right: 0;
	margin-right: -12px;
	border-left-color: #fff;
	}
.leaflet-tooltip-right:before {
	left: 0;
	margin-left: -12px;
	border-right-color: #fff;
	}

/* Printing */

@media print {
	/* Prevent printers from removing background-images of controls. */
	.leaflet-control {
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
		}
	}
`;

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
    return { entity, title: "Airspace", map: "dark", show_labels: false, show_trails: true, show_range_rings: true, show_ground: false };
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
    this._config = { map: "dark", show_labels: false, show_trails: true, show_range_rings: true, show_ground: false, ...config };
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
  }

  getCardSize() {
    return 10;
  }

  getLayoutOptions() {
    return { grid_rows: 8, grid_columns: 12, grid_min_rows: 6, grid_min_columns: 6 };
  }

  connectedCallback() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._gone = false;
    this._renderShell();
    this._ensureMap();
  }

  disconnectedCallback() {
    this._gone = true;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
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
      ha-card { overflow: hidden; display: block; background: #111; }
      .wrap { position: relative; width: 100%; min-height: 560px; height: min(70vh, 720px); background: #0d1117; }
      #map { position: absolute; inset: 0; width: 100%; height: 100%; }
      .leaflet-container { background: #0d1117; font: 12px/1.4 ui-sans-serif, system-ui, sans-serif; }
      .leaflet-container .leaflet-tile, .leaflet-container img.leaflet-tile {
        max-width: none !important; max-height: none !important; padding: 0 !important;
      }
      .leaflet-div-icon { background: transparent !important; border: 0 !important; overflow: visible !important; }
      .leaflet-control-zoom { display: none; }
      .leaflet-control-attribution { background: rgba(0,0,0,.45); color: #ccc; font-size: 10px; }
      .leaflet-control-attribution a { color: #9ad; }

      .hud {
        position: absolute; top: 10px; left: 10px; z-index: 1200;
        display: flex; align-items: center; gap: 8px; pointer-events: none;
      }
      .chip {
        pointer-events: none;
        display: flex; align-items: center; gap: 8px;
        background: rgba(12,16,22,.86); color: #fff; border-radius: 8px;
        padding: 7px 12px; font: 600 13px/1.2 ui-sans-serif, system-ui, sans-serif;
        box-shadow: 0 2px 10px rgba(0,0,0,.35);
      }
      .dot { width: 8px; height: 8px; border-radius: 50%; background: #4caf50; box-shadow: 0 0 8px #4caf50; }
      .dot.off { background: #9e9e9e; box-shadow: none; }
      .meta { font-weight: 500; color: #cfd8dc; font-size: 12px; }

      .rail {
        position: absolute; top: 10px; right: 10px; z-index: 1300;
        display: flex; flex-direction: column; gap: 5px;
      }
      .rail button, .zoom button, .layers button {
        width: 38px; height: 38px; border: 0; border-radius: 8px; cursor: pointer;
        background: rgba(12,16,22,.88); color: #e8eef4;
        font: 700 13px/1 ui-sans-serif, system-ui, sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,.35);
      }
      .rail button:hover, .zoom button:hover, .layers button:hover { background: rgba(30,38,50,.95); }
      .rail button.on, .layers button.on { background: #29b6f6; color: #08202c; }
      .rail button.gear { font-size: 16px; }

      .zoom {
        position: absolute; right: 10px; bottom: 54px; z-index: 1300;
        display: flex; flex-direction: column; gap: 5px;
      }

      .layers {
        position: absolute; left: 10px; bottom: 28px; z-index: 1300;
        display: flex; gap: 4px; flex-wrap: wrap; max-width: calc(100% - 60px);
      }
      .layers button { width: auto; height: 28px; padding: 0 8px; font-size: 11px; font-weight: 650; }

      .altbar {
        position: absolute; left: 10px; right: 58px; bottom: 8px; z-index: 1200;
        height: 7px; border-radius: 4px; overflow: hidden;
        background: linear-gradient(90deg, hsl(240,90%,58%), hsl(180,90%,55%), hsl(120,90%,50%), hsl(60,95%,50%), hsl(30,95%,52%), hsl(0,90%,55%));
        box-shadow: 0 1px 4px rgba(0,0,0,.4);
        pointer-events: none;
      }
      .altbar span { position: absolute; top: 9px; font: 600 9px/1 ui-sans-serif, system-ui; color: #ddd; text-shadow: 0 1px 2px #000; }
      .altbar .l { left: 0; } .altbar .m { left: 50%; transform: translateX(-50%); } .altbar .r { right: 0; }

      .nm {
        position: absolute; left: 10px; bottom: 42px; z-index: 1200;
        background: rgba(12,16,22,.86); color: #fff; border-radius: 6px;
        padding: 4px 8px; font: 650 11px/1 ui-monospace, monospace;
        pointer-events: none;
      }

      .settings {
        display: none; position: absolute; right: 54px; top: 10px; z-index: 1400;
        width: 250px; background: rgba(12,16,22,.94); color: #e8eef4;
        border: 1px solid rgba(255,255,255,.08); border-radius: 10px; padding: 12px; font-size: 13px;
        box-shadow: 0 8px 24px rgba(0,0,0,.45);
      }
      .settings.open { display: block; }
      .settings h3 { margin: 0 0 8px; font-size: 14px; }
      .settings label { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 8px 0; }
      .settings input[type=range] { width: 120px; }
      .settings .hint { color: #90a4ae; font-size: 11px; }

      .info {
        position: absolute; left: 10px; top: 48px; z-index: 1400;
        background: rgba(12,16,22,.92); color: #e8eef4;
        border: 1px solid rgba(255,255,255,.08); border-radius: 10px;
        padding: 10px 12px; min-width: 180px; font: 12px/1.45 ui-sans-serif, system-ui;
        box-shadow: 0 8px 24px rgba(0,0,0,.4);
      }
      .info .cs { font-weight: 700; font-size: 15px; letter-spacing: .02em; }
      .info .sub { color: #90a4ae; }
      .info button.close { position: absolute; top: 6px; right: 8px; background: none; border: 0; color: #90a4ae; cursor: pointer; font-size: 14px; }

      .ac-marker { display: flex; align-items: center; justify-content: center; transform-origin: center; }
      .ac-label {
        position: absolute; top: 100%; left: 50%; transform: translate(-50%, 2px);
        font: 700 10px/1.2 ui-monospace, monospace; color: #fff;
        text-shadow: 0 1px 2px #000, 0 0 6px #000; white-space: nowrap; text-align: center; pointer-events: none;
      }
      .home-pin { width: 10px; height: 10px; border-radius: 50%; background: #29b6f6; border: 2px solid #fff; box-shadow: 0 0 0 1px #29b6f6; }
    `;
  }

  _renderShell() {
    if (!this.shadowRoot || !this._config) return;
    if (this.shadowRoot.getElementById("map") && this._map) return;
    const title = this._config.title || "Airspace";
    this.shadowRoot.innerHTML = `
      <style>${LEAFLET_CSS_INLINE}</style>
      <style>${this._styles()}</style>
      <ha-card>
        <div class="wrap">
          <div id="map"></div>
          <div class="hud">
            <div class="chip"><span class="dot"></span><span class="title">${title}</span><span class="meta">connecting</span></div>
          </div>
          <div class="rail">
            <button type="button" data-act="labels" title="Labels">L</button>
            <button type="button" data-act="trail" title="Selected trail">T</button>
            <button type="button" data-act="ground" title="Ground traffic">G</button>
            <button type="button" data-act="military" title="Military only">M</button>
            <button type="button" data-act="pause" title="Pause">P</button>
            <button type="button" data-act="settings" class="gear" title="Settings">⚙</button>
          </div>
          <div class="zoom">
            <button type="button" data-act="in" title="Zoom in">+</button>
            <button type="button" data-act="out" title="Zoom out">−</button>
          </div>
          <div class="layers"></div>
          <div class="nm">— NM</div>
          <div class="altbar"><span class="l">0</span><span class="m">20k</span><span class="r">40,000 ft</span></div>
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
      </ha-card>
    `;
    this._meta = this._$(".meta");
    this._dot = this._$(".dot");
    this._mapEl = this.shadowRoot.getElementById("map");
    this._settingsEl = this._$(".settings");
    this._nmEl = this._$(".nm");
    this._labels = this._config.show_labels === true;
    this._tracks = this._config.show_trails !== false;
    this._ground = !!this._config.show_ground;
    this._milOnly = false;
    this._paused = false;
    this._mapId = this._config.map && MAPS[this._config.map] ? this._config.map : "dark";
    this._lastAc = [];
    this._interp = new Map();
    this._bindChrome();
    this._renderLayers();
    this._syncRail();
  }

  _bindChrome() {
    const root = this.shadowRoot;
    root.querySelector(".rail").addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      const act = b.dataset.act;
      if (act === "labels") { this._labels = !this._labels; this._redrawIcons(); }
      else if (act === "trail") { this._tracks = !this._tracks; if (!this._tracks && this._line && this._map) { this._map.removeLayer(this._line); this._line = null; } }
      else if (act === "ground") { this._ground = !this._ground; this._paint({ ac: this._lastAc, source: this._lastSource || "live" }); }
      else if (act === "military") { this._milOnly = !this._milOnly; this._paint({ ac: this._lastAc, source: this._lastSource || "live" }); }
      else if (act === "pause") {
        this._paused = !this._paused;
        if (this._dot) this._dot.classList.toggle("off", this._paused);
        if (!this._paused) this._fetch();
      }
      else if (act === "settings") {
        this._settingsEl.classList.toggle("open");
        this._syncSettings();
      }
      this._syncRail();
    });
    root.querySelector(".zoom").addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b || !this._map) return;
      if (b.dataset.act === "in") this._map.zoomIn();
      if (b.dataset.act === "out") this._map.zoomOut();
    });
    this._bindSettings();
  }

  _syncRail() {
    const rail = this._$(".rail");
    if (!rail) return;
    rail.querySelector('[data-act="labels"]').classList.toggle("on", this._labels);
    rail.querySelector('[data-act="trail"]').classList.toggle("on", this._tracks);
    rail.querySelector('[data-act="ground"]').classList.toggle("on", this._ground);
    rail.querySelector('[data-act="military"]').classList.toggle("on", this._milOnly);
    rail.querySelector('[data-act="pause"]').classList.toggle("on", this._paused);
  }

  _renderLayers() {
    const el = this._$(".layers");
    if (!el) return;
    el.innerHTML = "";
    Object.keys(MAPS).forEach((id) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = id[0].toUpperCase() + id.slice(1);
      if (id === this._mapId) b.classList.add("on");
      b.addEventListener("click", () => {
        this._mapId = id;
        this._setTiles(id);
        this._renderLayers();
      });
      el.appendChild(b);
    });
  }

  _bindSettings() {
    const panel = this._settingsEl;
    if (!panel) return;
    const range = panel.querySelector(".range");
    const rangeVal = panel.querySelector(".range-val");
    const notify = panel.querySelector(".notify");
    const rings = panel.querySelector(".rings");
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

  _syncSettings() {
    const panel = this._settingsEl;
    if (!panel) return;
    panel.querySelector(".range").value = String(this._radiusNm());
    panel.querySelector(".range-val").textContent = String(this._radiusNm());
    panel.querySelector(".notify").checked = this._notifyOn();
    panel.querySelector(".rings").checked = this._config.show_range_rings !== false;
  }

  _waitForSize(el) {
    return new Promise((resolve) => {
      const ready = () => el && el.clientWidth > 40 && el.clientHeight > 40;
      if (ready()) return resolve();
      const ro = new ResizeObserver(() => {
        if (ready()) { ro.disconnect(); resolve(); }
      });
      ro.observe(el);
      setTimeout(() => { ro.disconnect(); resolve(); }, 2500);
    });
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
    await this._waitForSize(this._mapEl);
    if (this._gone || !this._mapEl) return;
    const L = window.L;
    const home = this._home();
    this._map = L.map(this._mapEl, {
      zoomControl: false,
      attributionControl: true,
      worldCopyJump: true,
    });
    this._setTiles(this._mapId);
    this._rings = L.layerGroup().addTo(this._map);
    this._markers = new Map();
    this._trails = {};
    this._selected = null;
    this._alertInside = new Set();
    this._alertPrimed = false;
    this._map.setView([home.lat, home.lon], 9);
    this._drawRings();
    this._map.on("moveend", () => { this._updateScale(); this._fetch(); });
    this._map.on("zoomend", () => this._updateScale());
    const wrap = this._$(".wrap");
    this._ro = new ResizeObserver(() => { if (this._map) this._map.invalidateSize(); });
    if (wrap) this._ro.observe(wrap);
    const fixSize = () => { if (this._map) this._map.invalidateSize(); };
    requestAnimationFrame(fixSize);
    setTimeout(fixSize, 120);
    setTimeout(fixSize, 500);
    this._map.whenReady(() => { this._updateScale(); this._fetch(); });
    this._timer = setInterval(() => this._fetch(), POLL_MS);
    const tick = () => {
      if (this._gone) return;
      this._raf = requestAnimationFrame(tick);
      this._interpolate();
    };
    this._raf = requestAnimationFrame(tick);
  }

  _updateScale() {
    if (!this._map || !this._nmEl) return;
    const y = this._map.getSize().y / 2;
    const left = this._map.containerPointToLatLng([0, y]);
    const right = this._map.containerPointToLatLng([100, y]);
    const nm = haversineNm(left.lat, left.lng, right.lat, right.lng);
    this._nmEl.textContent = `${nm.toFixed(nm >= 10 ? 0 : 1)} NM`;
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
    const spec = MAPS[id] || MAPS.dark;
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
        L.circle([home.lat, home.lon], { radius: nm * 1852, color: "#29b6f6", weight: 1, opacity: 0.35, fill: false, interactive: false }).addTo(this._rings);
      });
    }
    L.circle([home.lat, home.lon], {
      radius: this._radiusNm() * 1852,
      color: "#ffa726",
      weight: 2,
      opacity: 0.85,
      fillColor: "#ffa726",
      fillOpacity: 0.07,
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
          new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3500)),
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
      this._lastAc = ac;
      this._lastSource = data.source || "live";
      this._paint({ ac, source: this._lastSource });
    } else if (this._meta) {
      this._meta.textContent = "feed error";
      if (this._dot) this._dot.classList.add("off");
    }
    this._busy = false;
  }

  _iconHtml(ac, sel) {
    const size = sel ? 44 : 36;
    const rot = ac.track || 0;
    const color = ["7500", "7600", "7700"].includes(ac.squawk) ? "#ef5350" : altColor(ac.alt);
    const label = this._labels || sel
      ? `<div class="ac-label">${callsign(ac)} ${ac.alt === "ground" ? "gnd" : (ac.alt != null ? Math.round(ac.alt) : "")}</div>`
      : "";
    return {
      size,
      html: `<div class="ac-marker" style="width:${size}px;height:${size}px;transform:rotate(${rot}deg)">
        <svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${PLANE_PATH}" fill="${color}" stroke="${sel ? "#fff" : "rgba(0,0,0,.55)"}" stroke-width="0.8" paint-order="stroke"/></svg>
      </div>${label}`,
    };
  }

  _redrawIcons() {
    if (!this._map || !window.L) return;
    const L = window.L;
    this._markers.forEach((mk, hex) => {
      const ac = this._lastAc.find((a) => a.hex === hex);
      if (!ac) return;
      const sel = hex === this._selected;
      const { size, html } = this._iconHtml(ac, sel);
      mk.setIcon(L.divIcon({ className: "ac-icon", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }));
    });
  }

  _interpolate() {
    if (!this._markers) return;
    const now = performance.now();
    this._interp.forEach((p, hex) => {
      const mk = this._markers.get(hex);
      if (!mk) return;
      const k = Math.min(1, (now - p.t0) / POLL_MS);
      mk.setLatLng([p.sLat + (p.tLat - p.sLat) * k, p.sLon + (p.tLon - p.sLon) * k]);
    });
  }

  _paint(data) {
    const L = window.L;
    if (!this._map || !L) return;
    const list = (data.ac || []).filter((a) => {
      if (!this._ground && a.alt === "ground") return false;
      if (this._milOnly && !((a.dbFlags || 0) & 1)) return false;
      return Number.isFinite(a.lat) && Number.isFinite(a.lon);
    });
    if (this._meta) this._meta.textContent = `${list.length} · ${data.source || "live"}`;
    if (this._dot) this._dot.classList.remove("off");
    this._runAlerts(list);

    const keep = new Set();
    const now = performance.now();
    list.forEach((ac) => {
      keep.add(ac.hex);
      const sel = ac.hex === this._selected;
      const { size, html } = this._iconHtml(ac, sel);
      const existing = this._markers.get(ac.hex);
      const prev = this._interp.get(ac.hex);
      if (existing) {
        const cur = existing.getLatLng();
        this._interp.set(ac.hex, {
          sLat: cur.lat, sLon: cur.lng, tLat: ac.lat, tLon: ac.lon, t0: now,
        });
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
          this._redrawIcons();
          this._info(ac);
        });
        this._markers.set(ac.hex, marker);
        this._interp.set(ac.hex, { sLat: ac.lat, sLon: ac.lon, tLat: ac.lat, tLon: ac.lon, t0: now });
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
        this._interp.delete(hex);
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
      else this._info(null);
    }
  }

  _info(ac) {
    let box = this._$(".info");
    if (!this._selected || !ac) {
      if (box) box.remove();
      return;
    }
    if (!box) {
      box = document.createElement("div");
      box.className = "info";
      const wrap = this._$(".wrap");
      if (wrap) wrap.appendChild(box);
    }
    const alt = ac.alt === "ground" ? "ground" : ac.alt != null ? `${Math.round(ac.alt)} ft` : "n/a";
    const spd = ac.gs != null ? `${Math.round(ac.gs)} kt` : "n/a";
    box.innerHTML = `<button type="button" class="close">✕</button>
      <div class="cs">${callsign(ac)}</div>
      <div>${ac.t || "type ?"} · ${ac.r || ac.hex}</div>
      <div>${alt} · ${spd} · ${ac.track != null ? Math.round(ac.track) + "°" : ""}</div>
      <div class="sub">sqk ${ac.squawk || "—"} · ${classify(ac).join(", ") || "civil"}</div>`;
    box.querySelector(".close").addEventListener("click", () => {
      this._selected = null;
      this._redrawIcons();
      box.remove();
    });
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
