const CARD_VERSION = "1.6.0";
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

const CAT = { A0: "N/A", A1: "Light", A2: "Small", A3: "Large", A4: "High vortex", A5: "Heavy", A6: "High perf", A7: "Rotorcraft" };
const CAT_LB = {
  A0: "N/A",
  A1: "Light (<15 500 lb)",
  A2: "Small (15 500 to 75 000 lb)",
  A3: "Large (75 000 to 300 000 lb)",
  A4: "High vortex large",
  A5: "Heavy (>300 000 lb)",
  A6: "High performance",
  A7: "Rotorcraft",
};
const NACP = { 0: "≥ 18.52 km", 1: "< 18.52 km", 2: "< 7.4 km", 3: "< 3.7 km", 4: "< 1.85 km", 5: "< 926 m", 6: "< 555 m", 7: "< 185 m", 8: "< 92 m", 9: "< 30 m", 10: "< 10 m", 11: "< 3 m" };
const NACV = { 0: "unknown", 1: "< 10 m/s", 2: "< 3 m/s", 3: "< 1 m/s", 4: "< 0.3 m/s" };
const SIL = { 0: "unknown", 1: "≤ 1e-3", 2: "≤ 1e-5", 3: "≤ 1e-7" };
const ADSB_VER = { 0: "v0 (DO-260)", 1: "v1 (DO-260A)", 2: "v2 (DO-260B)" };
const RULE_MATCHES = [
  ["military", "All military"],
  ["helicopter", "All helicopters"],
  ["chinook", "Chinook"],
  ["apache", "Apache"],
  ["blackhawk", "Black Hawk"],
  ["fighter", "Fighter"],
  ["police", "Police"],
  ["emergency", "Emergency"],
  ["type", "Type"],
  ["reg", "Registration"],
];
const DEFAULT_RULES = [
  { id: "mil", enabled: true, match: "military", value: "", radius_nm: 15, show_ring: true, notify: true, notify_service: "", tts: false, tts_media: "", title: "ADS-B {match}", message: "{callsign} ({type}) military {dist} NM" },
  { id: "heli", enabled: true, match: "helicopter", value: "", radius_nm: 15, show_ring: true, notify: true, notify_service: "", tts: false, tts_media: "", title: "ADS-B {match}", message: "{callsign} ({type}) helicopter {dist} NM" },
];
const RING_COLORS = ["#ffa726", "#29b6f6", "#66bb6a", "#ab47bc", "#ef5350", "#26c6da", "#ffee58"];
const DEFAULT_SOURCES = [
  { id: "adsblol", label: "adsb.lol", url: "https://api.adsb.lol/v2/lat/{lat}/lon/{lon}/dist/{dist}", enabled: true, interval: 1 },
  { id: "adsbfi", label: "opendata.adsb.fi", url: "https://opendata.adsb.fi/api/v3/lat/{lat}/lon/{lon}/dist/{dist}", enabled: true, interval: 1 },
];
const DEFAULT_QUICK = [
  { id: "q_mil", label: "All military", match: "military", value: "", radius_nm: 15, title: "ADS-B military", message: "{callsign} ({type}) military {dist} NM" },
  { id: "q_heli", label: "All helicopters", match: "helicopter", value: "", radius_nm: 15, title: "ADS-B helicopter", message: "{callsign} ({type}) helicopter {dist} NM" },
  { id: "q_chinook", label: "Chinook", match: "chinook", value: "", radius_nm: 20, title: "ADS-B chinook", message: "{callsign} ({type}) Chinook {dist} NM" },
  { id: "q_apache", label: "Apache", match: "apache", value: "", radius_nm: 20, title: "ADS-B apache", message: "{callsign} ({type}) Apache {dist} NM" },
];
const DEFAULT_PANEL = { w: 208, h: 38, left: 1.5, top: 1.5 };

function shortLon(from, to) {
  let t = Number(to);
  const f = Number(from);
  while (t - f > 180) t -= 360;
  while (t - f < -180) t += 360;
  return t;
}

function impliedKt(nm, dtMs) {
  const hours = Math.max(Number(dtMs) || 0, 400) / 3600000;
  return nm / hours;
}

function jumpTooFast(fromLat, fromLon, toLat, toLon, dtMs, gs) {
  const nm = haversineNm(fromLat, fromLon, toLat, toLon);
  const kt = impliedKt(nm, dtMs);
  const reported = Number(gs);
  const cap = Math.max(600, Number.isFinite(reported) && reported > 0 ? reported * 2.5 : 2310);
  return kt > cap;
}
const MARKER_PATH = "/adsb_globe/tar1090-markers.json";
const TYPE_ALIAS = {
  AH64: "H64", AH64A: "H64", AH64D: "H64", AH64E: "H64",
  CH47: "H47", CH47D: "H47", CH47F: "H47", MH47: "H47", MH47G: "H47",
  UH60: "H60", UH60L: "H60", UH60M: "H60", HH60: "H60", SH60: "H60", S70: "H60", S70A: "H60", S70I: "H60",
};
const EXTRA_TYPES = {
  PC12: ["jet_nonswept", 0.95], PC24: ["jet_nonswept", 0.96],
  C172: ["cessna", 1], C152: ["cessna", 0.92], C182: ["cessna", 1],
  EC35: ["dauphin", 0.95], EC45: ["dauphin", 1], A109: ["helicopter", 1], B06: ["helicopter", 0.9],
};
let MARKERS = null;
let markersLoader = null;

function fmt(v, digits, suffix) {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return String(v) + (suffix || "");
  return (digits == null ? String(n) : n.toFixed(digits)) + (suffix || "");
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => {
    if (c === "&") return "&" + "amp;";
    if (c === "<") return "&" + "lt;";
    if (c === ">") return "&" + "gt;";
    if (c === '"') return "&" + "quot;";
    return "&#39;";
  });
}

function normId(s) {
  return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function matchRule(ac, rule) {
  if (!rule || rule.enabled === false) return false;
  const value = String(rule.value || "").trim().toUpperCase();
  const kinds = classify(ac);
  if (rule.match === "type") {
    if (!value) return false;
    const t = (ac.t || "").toUpperCase();
    const desc = (ac.desc || "").toUpperCase();
    const want = normId(value);
    return t === value || desc.includes(value) || (!!want && (normId(t) === want || normId(desc).includes(want)));
  }
  if (rule.match === "reg") {
    const reg = normId(ac.r);
    const want = normId(value);
    return !!want && (reg === want || reg.startsWith(want));
  }
  return kinds.includes(rule.match);
}

function formatAlert(template, ac, rule, dist) {
  const text = template || "{callsign} ({type}) {match} {dist} NM";
  return text
    .replaceAll("{callsign}", callsign(ac))
    .replaceAll("{type}", ac.t || "?")
    .replaceAll("{reg}", ac.r || "")
    .replaceAll("{hex}", ac.hex || "")
    .replaceAll("{dist}", Number(dist).toFixed(1))
    .replaceAll("{match}", rule.match || "alert")
    .replaceAll("{alt}", ac.alt == null ? "" : String(ac.alt))
    .replaceAll("{value}", rule.value || "")
    .replaceAll("{desc}", ac.desc || "")
    .replaceAll("{operator}", ac.ownOp || "")
    .replaceAll("{gs}", ac.gs == null ? "" : String(Math.round(Number(ac.gs))))
    .replaceAll("{squawk}", ac.squawk || "")
    .replaceAll("{flight}", ac.flight || callsign(ac));
}

function newRuleId() {
  return "r" + Math.random().toString(36).slice(2, 8);
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
    desc: String(raw.desc || "").trim(),
    ownOp: String(raw.ownOp || "").trim(),
    alt: alt === "ground" ? "ground" : (typeof alt === "number" ? alt : null),
    alt_geom: raw.alt_geom,
    gs: raw.gs,
    tas: raw.tas,
    ias: raw.ias,
    mach: raw.mach,
    track: raw.track,
    mag_heading: raw.mag_heading,
    true_heading: raw.true_heading,
    track_rate: raw.track_rate,
    roll: raw.roll,
    baro_rate: raw.baro_rate,
    geom_rate: raw.geom_rate,
    squawk: String(raw.squawk || "").trim(),
    category: raw.category || "",
    lat,
    lon,
    seen: raw.seen || 0,
    seen_pos: raw.seen_pos,
    rssi: raw.rssi,
    messages: raw.messages,
    dbFlags: raw.dbFlags || 0,
    emergency: raw.emergency && raw.emergency !== "none" ? raw.emergency : "",
    dst: raw.dst,
    nav_qnh: raw.nav_qnh,
    nav_altitude_mcp: raw.nav_altitude_mcp,
    nav_heading: raw.nav_heading,
    wd: raw.wd,
    ws: raw.ws,
    oat: raw.oat,
    tat: raw.tat,
    nac_p: raw.nac_p,
    nac_v: raw.nac_v,
    sil: raw.sil,
    nic_baro: raw.nic_baro,
    rc: raw.rc,
    version: raw.version,
    source: raw.source || (raw.mlat && raw.mlat.length ? "MLAT" : "ADS-B"),
  };
}


function asList(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function markerPair(ac) {
  if (!MARKERS) return ["unknown", 1];
  const raw = (ac.t || "").toUpperCase();
  const t = TYPE_ALIAS[raw] || raw;
  if (MARKERS.types[t]) return MARKERS.types[t];
  if (EXTRA_TYPES[t]) return EXTRA_TYPES[t];
  const cat = ac.category || "";
  if (MARKERS.categories[cat]) return MARKERS.categories[cat];
  if (ac.alt === "ground") return ["ground_square", 1];
  return ["unknown", 1];
}

function shapeSvg(shape, fill, stroke, size, selected) {
  const scale = shape.strokeScale || 1;
  const sw = (selected ? 1.1 : 0.75) * scale;
  if (shape.svg) {
    return String(shape.svg)
      .split("fillColor").join(fill)
      .split("strokeColor").join(stroke)
      .split("strokeWidth").join(String(sw))
      .replace("SIZE", "width=\"" + size + "\" height=\"" + size + "\"");
  }
  const vb = shape.viewBox || ("0 0 " + shape.w + " " + shape.h);
  const paths = asList(shape.path).map((d) =>
    "<path paint-order=\"stroke\" fill=\"" + fill + "\" stroke=\"" + stroke + "\" stroke-width=\"" + (2 * sw) + "\" stroke-linejoin=\"round\" d=\"" + d + "\"/>"
  ).join("");
  const accents = asList(shape.accent).map((d) =>
    "<path fill=\"none\" stroke=\"" + stroke + "\" stroke-width=\"" + (0.6 * sw) + "\" d=\"" + d + "\"/>"
  ).join("");
  const inner = shape.transform ? ("<g transform=\"" + shape.transform + "\">" + paths + accents + "</g>") : (paths + accents);
  const par = shape.noAspect ? "preserveAspectRatio=\"none\" " : "";
  return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"" + vb + "\" width=\"" + size + "\" height=\"" + size + "\" " + par + "aria-hidden=\"true\">" + inner + "</svg>";
}

function iconParts(ac, fill, stroke, base, selected) {
  const [name, scale] = markerPair(ac);
  const shape = (MARKERS && MARKERS.shapes && MARKERS.shapes[name]) || { w: 24, h: 24, viewBox: "0 0 24 24", path: PLANE_PATH };
  const size = Math.round(base * (scale || 1));
  return { svg: shapeSvg(shape, fill, stroke, size, selected), size, noRotate: !!shape.noRotate, name };
}

function loadMarkers(hass) {
  if (MARKERS) return Promise.resolve(MARKERS);
  if (markersLoader) return markersLoader;
  const url = (hass && hass.hassUrl ? hass.hassUrl(MARKER_PATH) : MARKER_PATH) + "?v=" + CARD_VERSION;
  markersLoader = fetch(url)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("markers " + r.status))))
    .then((data) => {
      MARKERS = data;
      Object.keys(EXTRA_TYPES).forEach((t) => {
        if (!MARKERS.types[t]) MARKERS.types[t] = EXTRA_TYPES[t];
      });
      return MARKERS;
    })
    .catch(() => {
      markersLoader = null;
      return null;
    });
  return markersLoader;
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
    this._hydrateRules();
    this._loadMarkerPack();
    if (!this.shadowRoot) return;
    if (!(this._settingsEl && this._settingsEl.classList.contains("open"))) this._applyPanelSize();
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
        width: min(340px, calc(100% - 70px)); max-height: calc(100% - 24px); overflow: auto;
        background: rgba(12,16,22,.96); color: #e8eef4;
        border: 1px solid rgba(255,255,255,.08); border-radius: 10px; padding: 12px; font-size: 13px;
        box-shadow: 0 8px 24px rgba(0,0,0,.45);
      }
      .settings.open { display: block; }
      .settings h3 { margin: 0 0 8px; font-size: 14px; }
      .settings label { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 8px 0; }
      .settings input[type=range] { width: 120px; }
      .settings .hint { color: #90a4ae; font-size: 11px; }
      .settings .sec { margin: 12px 0 4px; font-size: 10px; letter-spacing: .08em; color: #90a4ae; text-transform: uppercase; }
      .settings select, .settings input[type=text], .settings input[type=number] {
        background: #0d1117; color: #e8eef4; border: 1px solid rgba(255,255,255,.12);
        border-radius: 6px; padding: 4px 6px; font: 12px ui-sans-serif, system-ui; width: 100%;
        margin: 4px 0; box-sizing: border-box;
      }
      .src-row .rm, .q-row .rm { background: none; border: 0; color: #ef9a9a; cursor: pointer; font-size: 16px; }

      .ac-marker { display: flex; align-items: center; justify-content: center; transform-origin: center; }
      .ac-label {
        position: absolute; top: 100%; left: 50%; transform: translate(-50%, 2px);
        font: 700 10px/1.2 ui-monospace, monospace; color: #fff;
        text-shadow: 0 1px 2px #000, 0 0 6px #000; white-space: nowrap; text-align: center; pointer-events: none;
      }

      .hover {
        display: none; position: absolute; z-index: 1600; min-width: 210px;
        background: rgba(20,24,28,.94); color: #e8eef4; border-radius: 8px;
        padding: 10px 12px; font: 12px/1.45 ui-sans-serif, system-ui;
        box-shadow: 0 8px 24px rgba(0,0,0,.45); pointer-events: none;
      }
      .hover.open { display: block; }
      .hover .cs { font: 700 16px/1.2 ui-sans-serif, system-ui; letter-spacing: .04em; }
      .hover .hex { color: #b0bec5; margin-bottom: 8px; }
      .hover .row { display: flex; justify-content: space-between; gap: 16px; }
      .hover .k { color: #90a4ae; }
      .pair { display: flex; gap: 6px; margin: 6px 0; align-items: center; }
      .pair select, .pair input { flex: 1; min-width: 0; }
      .src-row, .q-row {
        display: flex; align-items: center; gap: 6px; margin: 5px 0;
        font-size: 12px; flex-wrap: wrap;
      }
      .src-row span.name, .q-row span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .src-row .rate {
        flex: 1 0 100%; display: flex; align-items: center; gap: 8px;
        margin: 0 0 4px 22px; color: #90a4ae; font-size: 11px;
      }
      .src-row .rate input[type=range] { width: 110px; }
      .src-row .rate .ival { color: #90caf9; min-width: 2.8em; font-variant-numeric: tabular-nums; }
      .src-add, .q-add { width: 100%; margin-top: 6px; }
      .fine label span.num { font-variant-numeric: tabular-nums; color: #90caf9; min-width: 3.2em; text-align: right; }
      .fine input[type=range] { width: 140px; }
      .corners { display: flex; gap: 4px; flex-wrap: wrap; margin: 6px 0; }
      .corners button {
        border: 0; border-radius: 6px; background: rgba(255,255,255,.08); color: #e8eef4;
        font: 650 11px ui-sans-serif, system-ui; padding: 4px 8px; cursor: pointer;
      }

      .panel {
        display: none; position: absolute; left: var(--panel-left, 1.5%); top: var(--panel-top, 1.5%); z-index: 1500;
        right: auto; bottom: auto;
        width: min(var(--panel-w, 208px), calc(100% - 70px)); max-height: var(--panel-h, 38%); overflow: auto;
        background: rgba(16,20,24,.94); color: #e8eef4; border-radius: 10px;
        box-shadow: 0 12px 32px rgba(0,0,0,.5);
      }
      .panel.open { display: block; }
      .panel .photo { width: 100%; max-height: var(--panel-photo, 88px); object-fit: cover; display: block; background: #111; }
      .panel .cred { font-size: 10px; color: #90a4ae; padding: 4px 12px 0; }
      .panel .body { padding: 10px 12px 16px; }
      .panel .cs { font: 700 18px/1.2 ui-sans-serif, system-ui; }
      .panel .hex { color: #90a4ae; margin-bottom: 8px; }
      .panel .row { display: flex; justify-content: space-between; gap: 12px; margin: 3px 0; font-size: 12px; }
      .panel .k { color: #90a4ae; }
      .panel h4 {
        margin: 10px -12px 6px; padding: 4px 12px; font-size: 11px; letter-spacing: .08em;
        background: #1c4a52; color: #d4f3f6; font-weight: 700;
      }
      .panel .x {
        position: sticky; top: 6px; float: right; margin: 6px 8px 0 0; z-index: 2;
        border: 0; background: rgba(0,0,0,.4); color: #fff; width: 24px; height: 24px;
        border-radius: 50%; cursor: pointer;
      }
      .rule {
        border: 1px solid rgba(255,255,255,.08); border-radius: 8px; padding: 8px; margin: 8px 0;
        background: rgba(255,255,255,.03);
      }
      .rule .top { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
      .rule select, .rule input[type=text], .rule input[type=number] {
        background: #0d1117; color: #e8eef4; border: 1px solid rgba(255,255,255,.12);
        border-radius: 6px; padding: 4px 6px; font: 12px ui-sans-serif, system-ui; width: 100%;
      }
      .rule .rm { background: none; border: 0; color: #ef9a9a; cursor: pointer; font-size: 16px; }
      .add-rule, .add-alert, .q-add, .src-add, .chips button {
        border: 0; border-radius: 6px; background: #29b6f6; color: #08202c;
        font: 650 12px ui-sans-serif, system-ui; padding: 6px 10px; cursor: pointer;
      }
      .chips { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0 8px; }
      .chips button { background: rgba(255,255,255,.08); color: #e8eef4; padding: 4px 8px; }
      .chips button.on { background: #29b6f6; color: #08202c; }
      .chips .empty { color: #90a4ae; font-size: 11px; padding: 2px 0; }
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
          <div class="hover"></div>
          <div class="panel"></div>
          <div class="settings">
            <h3>Settings</h3>
            <div class="sec">Details box</div>
            <div class="fine">
              <label>Width <span class="num pw-val">208px</span> <input type="range" class="pw" min="160" max="420" step="2" value="208"></label>
              <label>Height <span class="num ph-val">38%</span> <input type="range" class="ph" min="16" max="90" step="1" value="38"></label>
              <label>From left <span class="num pl-val">1.5%</span> <input type="range" class="pl" min="0" max="72" step="0.5" value="1.5"></label>
              <label>From top <span class="num pt-val">1.5%</span> <input type="range" class="pt" min="0" max="72" step="0.5" value="1.5"></label>
            </div>
            <div class="corners">
              <button type="button" data-corner="tl">Top left</button>
              <button type="button" data-corner="tr">Top right</button>
              <button type="button" data-corner="bl">Bottom left</button>
              <button type="button" data-corner="br">Bottom right</button>
            </div>
            <div class="sec">Data sources</div>
            <div class="hint">Enable networks or paste a tar1090 aircraft.json URL. Each stream has its own update rate. Public feeds cap one request at 250 NM — extra tiles fill the rest of the view so planes stay put when you pan.</div>
            <div class="sources"></div>
            <div class="pair">
              <input type="text" class="src-url" placeholder="https://host/tar1090/data/aircraft.json">
            </div>
            <button type="button" class="src-add add-rule">+ Add source</button>
            <div class="sec">Quick select</div>
            <div class="hint">Chips used to add a watch. Fill every field, then add.</div>
            <div class="quick-list"></div>
            <input type="text" class="q-label" placeholder="Label · e.g. 737 MAX">
            <select class="q-match"></select>
            <input type="text" class="q-value" placeholder="Type/reg if needed · B38M">
            <label>Radius <span class="num q-rad-val">15</span> NM <input type="range" class="q-rad" min="5" max="80" step="1" value="15"></label>
            <input type="text" class="q-title" placeholder="Title · ADS-B {match}">
            <input type="text" class="q-msg" placeholder="Message · {callsign} ({type}) {dist} NM">
            <button type="button" class="q-add">+ Add to quick list</button>
            <div class="sec">Alerts</div>
            <label>Master notifications
              <input type="checkbox" class="notify" checked>
            </label>
            <div class="hint">Each rule has its own radius, ring, text and actions.</div>
            <div class="sec">Quick chips</div>
            <div class="chips"></div>
            <div class="sec">Rules</div>
            <div class="rules"></div>
            <button type="button" class="add-alert">+ Add alert</button>
            <div class="hint" style="margin-top:8px">{callsign} {type} {reg} {hex} {dist} {match} {alt} {desc} {operator} {gs} {squawk}</div>
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
    this._tracks = true;
    this._ground = !!this._config.show_ground;
    this._milOnly = false;
    this._paused = false;
    this._mapId = this._config.map && MAPS[this._config.map] ? this._config.map : "dark";
    this._lastAc = [];
    this._byHex = new Map();
    this._interp = new Map();
    this._rules = (this._config.alert && this._config.alert.rules) || DEFAULT_RULES.map((r) => ({ ...r }));
    this._sources = DEFAULT_SOURCES.map((r) => ({ ...r }));
    this._quick = DEFAULT_QUICK.map((r) => ({ ...r }));
    this._panel = { ...DEFAULT_PANEL };
    this._bindChrome();
    this._renderLayers();
    this._syncRail();
    this._hydrateRules();
    this._hydratePanelSize();
    this._loadMarkerPack();
    this._renderSources();
    this._renderQuick();
    this._renderRules();
    this._renderChips();
  }

  _bindChrome() {
    const root = this.shadowRoot;
    root.querySelector(".rail").addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      const act = b.dataset.act;
      if (act === "labels") { this._labels = !this._labels; this._redrawIcons(); }
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
    const panel = this._$(".panel");
    if (panel) {
      panel.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (ev.target.closest(".x")) this._closeSelected();
      });
    }
    if (this._settingsEl) this._settingsEl.addEventListener("click", (ev) => ev.stopPropagation());
  }

  _syncRail() {
    const rail = this._$(".rail");
    if (!rail) return;
    rail.querySelector('[data-act="labels"]').classList.toggle("on", this._labels);
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

  _hydrateRules() {
    if (this._rulesHydrated) return;
    const st = this._entityState();
    if (!st) return;
    this._rulesHydrated = true;
    const a = st.attributes || {};
    const rules = a.alert_rules;
    if (Array.isArray(rules) && rules.length) {
      this._rules = rules.map((r) => ({ ...r }));
      if (this._map) this._drawRings();
    }
    if (Array.isArray(a.sources) && a.sources.length) {
      this._sources = a.sources.map((r) => ({ ...r }));
    }
    if (Array.isArray(a.quick_types) && a.quick_types.length) {
      this._quick = a.quick_types.map((r) => ({ ...r }));
    }
    if (a.panel && typeof a.panel === "object") {
      this._panel = { ...DEFAULT_PANEL, ...a.panel };
    } else {
      try {
        const ls = JSON.parse(window.localStorage && localStorage.getItem("adsb_globe_panel") || "null");
        if (ls && typeof ls === "object") this._panel = { ...DEFAULT_PANEL, ...ls };
      } catch (err) { /* ignore */ }
    }
    if (this._$(".rules")) this._renderRules();
    if (this._$(".sources")) this._renderSources();
    if (this._$(".quick-list")) this._renderQuick();
    if (this._$(".chips")) this._renderChips();
    this._applyPanelSize();
  }

  _bindSettings() {
    const panel = this._settingsEl;
    if (!panel) return;
    const notify = panel.querySelector(".notify");
    notify.addEventListener("change", () => this._savePrefs());
    const addAlert = panel.querySelector(".add-alert");
    if (addAlert) {
      addAlert.addEventListener("click", () => {
        this._addRule({ match: "type", value: "", radius_nm: 20, message: "{callsign} ({type}/{reg}) {dist} NM" });
      });
    }
    ["pw", "ph", "pl", "pt"].forEach((cls) => {
      const el = panel.querySelector("." + cls);
      if (!el) return;
      el.addEventListener("input", () => this._readPanelSliders());
      el.addEventListener("change", () => { this._readPanelSliders(); this._savePrefs(); });
    });
    const corners = panel.querySelector(".corners");
    if (corners) {
      corners.addEventListener("click", (ev) => {
        const b = ev.target.closest("button");
        if (!b || !b.dataset.corner) return;
        this._placePanel(b.dataset.corner);
      });
    }
    const srcAdd = panel.querySelector(".src-add");
    const srcUrl = panel.querySelector(".src-url");
    if (srcAdd) srcAdd.addEventListener("click", () => this._addSource());
    if (srcUrl) {
      srcUrl.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") { ev.preventDefault(); this._addSource(); }
      });
    }
    const qMatch = panel.querySelector(".q-match");
    if (qMatch && !qMatch.options.length) {
      RULE_MATCHES.forEach(([id, label]) => {
        const o = document.createElement("option");
        o.value = id;
        o.textContent = label;
        qMatch.appendChild(o);
      });
    }
    const qRad = panel.querySelector(".q-rad");
    if (qRad) {
      qRad.addEventListener("input", () => {
        const n = panel.querySelector(".q-rad-val");
        if (n) n.textContent = String(qRad.value);
      });
    }
    const qAdd = panel.querySelector(".q-add");
    if (qAdd) qAdd.addEventListener("click", () => this._addQuick());
  }

  _readPanelSliders() {
    const num = (sel, fallback) => {
      const n = this._$(sel);
      const v = n ? Number(n.value) : fallback;
      return Number.isFinite(v) ? v : fallback;
    };
    this._panel = {
      w: num(".pw", 208),
      h: num(".ph", 38),
      left: num(".pl", 1.5),
      top: num(".pt", 1.5),
    };
    this._applyPanelSize();
  }

  _placePanel(corner) {
    const wrap = this._$(".wrap");
    const ww = wrap ? wrap.clientWidth : 800;
    const hh = wrap ? wrap.clientHeight : 600;
    const p = this._panel || { ...DEFAULT_PANEL };
    const leftR = Math.max(0, Math.min(72, Number((((ww - p.w - 14) / ww) * 100).toFixed(1))));
    const topB = Math.max(0, Math.min(72, Number((((hh * (1 - p.h / 100) - 14) / hh) * 100).toFixed(1))));
    if (corner === "tl") { p.left = 1.5; p.top = 1.5; }
    if (corner === "tr") { p.left = leftR; p.top = 1.5; }
    if (corner === "bl") { p.left = 1.5; p.top = topB; }
    if (corner === "br") { p.left = leftR; p.top = topB; }
    this._panel = p;
    this._applyPanelSize();
    this._savePrefs();
  }

  _hydratePanelSize() {
    this._applyPanelSize();
  }

  _applyPanelSize() {
    const raw = this._panel || { ...DEFAULT_PANEL };
    this._panel = {
      w: Math.max(160, Math.min(420, Number(raw.w) || 208)),
      h: Math.max(16, Math.min(90, Number(raw.h) || 38)),
      left: Math.max(0, Math.min(72, Number(raw.left) ?? 1.5)),
      top: Math.max(0, Math.min(72, Number(raw.top) ?? 1.5)),
    };
    const panel = this._$(".panel");
    if (panel) {
      panel.style.setProperty("--panel-w", this._panel.w + "px");
      panel.style.setProperty("--panel-h", this._panel.h + "%");
      panel.style.setProperty("--panel-photo", Math.round(40 + this._panel.h * 1.4) + "px");
      panel.style.setProperty("--panel-left", this._panel.left + "%");
      panel.style.setProperty("--panel-top", this._panel.top + "%");
    }
    const setTxt = (sel, t) => { const n = this._$(sel); if (n) n.textContent = t; };
    const setVal = (sel, v) => { const n = this._$(sel); if (n) n.value = v; };
    setTxt(".pw-val", this._panel.w + "px");
    setTxt(".ph-val", this._panel.h + "%");
    setTxt(".pl-val", Number(this._panel.left).toFixed(1) + "%");
    setTxt(".pt-val", Number(this._panel.top).toFixed(1) + "%");
    setVal(".pw", this._panel.w);
    setVal(".ph", this._panel.h);
    setVal(".pl", this._panel.left);
    setVal(".pt", this._panel.top);
  }

  _savePanelSize() {
    this._savePrefs();
  }

  _loadMarkerPack() {
    if (this._markersRequested || !this._hass) return;
    this._markersRequested = true;
    loadMarkers(this._hass).then((data) => {
      if (data && this._map) this._redrawIcons();
    });
  }

  _syncSettings() {
    const panel = this._settingsEl;
    if (!panel) return;
    panel.querySelector(".notify").checked = this._notifyOn();
    this._applyPanelSize();
    this._renderSources();
    this._renderQuick();
    this._renderRules();
    this._renderChips();
  }

  _notifyServices() {
    const out = [];
    const svcs = (this._hass && this._hass.services && this._hass.services.notify) || {};
    Object.keys(svcs).forEach((name) => {
      if (name === "persistent_notification") return;
      out.push({ id: "notify." + name, label: name.replace(/_/g, " ") });
    });
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
  }

  _mediaPlayers() {
    const out = [];
    const states = (this._hass && this._hass.states) || {};
    Object.keys(states).forEach((id) => {
      if (!id.startsWith("media_player.")) return;
      const st = states[id];
      const label = (st.attributes && st.attributes.friendly_name) || id.replace("media_player.", "");
      out.push({ id, label });
    });
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
  }

  _comboHtml(items, current, emptyLabel, selClass, inputClass, placeholder) {
    const known = items.some((o) => o.id === current);
    const custom = !!(current && !known);
    const opts = [
      `<option value="">${esc(emptyLabel)}</option>`,
      ...items.map((o) => `<option value="${esc(o.id)}"${o.id === current ? " selected" : ""}>${esc(o.label)}</option>`),
      `<option value="__custom__"${custom ? " selected" : ""}>Custom…</option>`,
    ].join("");
    return `<div class="pair"><select class="${selClass}">${opts}</select></div>
      <input type="text" class="${inputClass}" placeholder="${esc(placeholder)}" style="${custom ? "" : "display:none"}">`;
  }

  _comboValue(root, selClass, inputClass) {
    const sel = root.querySelector("." + selClass);
    const inp = root.querySelector("." + inputClass);
    if (!sel) return (inp && inp.value) || "";
    if (sel.value === "__custom__") return ((inp && inp.value) || "").trim();
    return sel.value;
  }

  _bindCombo(root, selClass, inputClass, onChange) {
    const sel = root.querySelector("." + selClass);
    const inp = root.querySelector("." + inputClass);
    if (!sel || !inp) return;
    const syncVis = () => {
      inp.style.display = sel.value === "__custom__" ? "" : "none";
    };
    sel.addEventListener("change", () => { syncVis(); onChange(); });
    inp.addEventListener("change", onChange);
    inp.addEventListener("input", onChange);
  }

  _addSource() {
    const inp = this._$(".src-url");
    const raw = ((inp && inp.value) || "").trim();
    if (!/^https?:\/\//i.test(raw)) return;
    if ((this._sources || []).some((s) => s.url === raw)) {
      if (inp) inp.value = "";
      return;
    }
    let label = raw;
    try { label = new URL(raw).host; } catch (err) { /* keep */ }
    this._sources.push({
      id: "s" + Math.random().toString(36).slice(2, 8),
      label,
      url: raw,
      enabled: true,
      interval: 1,
    });
    if (inp) inp.value = "";
    this._renderSources();
    this._savePrefs();
  }

  _renderSources() {
    const el = this._$(".sources");
    if (!el) return;
    el.innerHTML = "";
    (this._sources || []).forEach((src, i) => {
      if (src.interval == null || !(Number(src.interval) > 0)) src.interval = 1;
      const row = document.createElement("div");
      row.className = "src-row";
      const ival = Number(src.interval) || 1;
      row.innerHTML = `<input type="checkbox" class="on"> <span class="name" title="${esc(src.url)}">${esc(src.label || src.url)}</span> <button type="button" class="rm" title="Remove">×</button>
        <div class="rate">Update <span class="ival">${ival}s</span> <input type="range" class="intv" min="0.5" max="10" step="0.5" value="${ival}"></div>`;
      row.querySelector(".on").checked = src.enabled !== false;
      row.querySelector(".on").addEventListener("change", () => {
        src.enabled = row.querySelector(".on").checked;
        this._savePrefs();
      });
      const slider = row.querySelector(".intv");
      const ivalEl = row.querySelector(".ival");
      slider.addEventListener("input", () => {
        src.interval = Number(slider.value);
        ivalEl.textContent = src.interval + "s";
      });
      slider.addEventListener("change", () => {
        src.interval = Number(slider.value);
        ivalEl.textContent = src.interval + "s";
        this._savePrefs();
      });
      row.querySelector(".rm").addEventListener("click", () => {
        this._sources.splice(i, 1);
        this._renderSources();
        this._savePrefs();
      });
      el.appendChild(row);
    });
  }

  _addQuick() {
    const label = ((this._$(".q-label") && this._$(".q-label").value) || "").trim();
    const match = (this._$(".q-match") && this._$(".q-match").value) || "type";
    const value = ((this._$(".q-value") && this._$(".q-value").value) || "").trim();
    const radius = Number((this._$(".q-rad") && this._$(".q-rad").value) || 15);
    const title = ((this._$(".q-title") && this._$(".q-title").value) || "").trim() || ("ADS-B " + label);
    const message = ((this._$(".q-msg") && this._$(".q-msg").value) || "").trim() || `{callsign} ({type}) ${label || match} {dist} NM`;
    if (!label) return;
    if ((match === "type" || match === "reg") && !value) return;
    if ((this._quick || []).some((q) => q.label === label && q.match === match && normId(q.value) === normId(value))) return;
    this._quick.push({
      id: "q" + Math.random().toString(36).slice(2, 8),
      label,
      match,
      value,
      radius_nm: Math.max(5, Math.min(80, radius || 15)),
      title,
      message,
    });
    const clear = (sel) => { const n = this._$(sel); if (n) n.value = ""; };
    clear(".q-label");
    clear(".q-value");
    clear(".q-title");
    clear(".q-msg");
    this._renderQuick();
    this._renderChips();
    this._savePrefs();
  }

  _renderQuick() {
    const el = this._$(".quick-list");
    if (!el) return;
    el.innerHTML = "";
    (this._quick || []).forEach((q, i) => {
      const row = document.createElement("div");
      row.className = "q-row";
      const extra = q.value ? ` · ${q.value}` : "";
      row.innerHTML = `<span title="${esc(q.match + extra)}">${esc(q.label)}${q.radius_nm ? " · " + q.radius_nm + " NM" : ""}</span> <button type="button" class="rm" title="Remove">×</button>`;
      row.querySelector(".rm").addEventListener("click", () => {
        this._quick.splice(i, 1);
        this._renderQuick();
        this._renderChips();
        this._savePrefs();
      });
      el.appendChild(row);
    });
  }

  _hasRule(match, value) {
    const want = normId(value);
    if (match === "type" || match === "reg") {
      if (!want) return false;
      return (this._rules || []).some((r) => r.match === match && normId(r.value) === want);
    }
    return (this._rules || []).some((r) => r.match === match && !r.value);
  }

  _addRule(partial) {
    const rule = {
      id: newRuleId(),
      enabled: true,
      match: "type",
      value: "",
      radius_nm: 20,
      show_ring: true,
      notify: true,
      notify_service: "",
      tts: false,
      tts_media: "",
      title: "ADS-B {match}",
      message: "{callsign} ({type}/{reg}) {dist} NM",
      ...partial,
    };
    if (this._hasRule(rule.match, rule.value)) return;
    this._rules.push(rule);
    this._renderRules();
    this._saveRules();
  }

  _renderChips() {
    const el = this._$(".chips");
    if (!el) return;
    el.innerHTML = "";
    const addChip = (label, match, value, spec) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      if (this._hasRule(match, value)) b.classList.add("on");
      const isObj = spec && typeof spec === "object";
      b.title = isObj ? (spec.label || "Watch") : (spec || "Watch this type");
      b.addEventListener("click", () => {
        this._addRule({
          match,
          value: value || "",
          radius_nm: isObj && spec.radius_nm ? spec.radius_nm : 20,
          title: isObj ? spec.title : undefined,
          message: isObj && spec.message ? spec.message : "{callsign} ({type}/{reg}) {dist} NM",
        });
        this._renderChips();
      });
      el.appendChild(b);
    };
    (this._quick || []).forEach((q) => {
      addChip(q.label, q.match, q.value, q);
    });
    const seen = new Set((this._quick || []).map((q) => (q.value || q.label || "").toUpperCase()));
    (this._lastAc || []).forEach((ac) => {
      const kinds = classify(ac);
      if (!(kinds.includes("military") || kinds.includes("helicopter"))) return;
      const key = (ac.t || ac.r || ac.hex).toUpperCase();
      if (seen.has(key)) return;
      seen.add(key);
      const match = ac.t ? "type" : "reg";
      const value = ac.t || ac.r;
      addChip([ac.t, ac.r].filter(Boolean).join(" · ") || ac.hex, match, value, ac.desc ? `${ac.desc}${ac.r ? " · " + ac.r : ""}` : "Watch this type");
    });
    if (!el.childNodes.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "None yet — add a type above.";
      el.appendChild(empty);
    }
  }

  _renderRules() {
    const box = this._$(".rules");
    if (!box) return;
    box.innerHTML = "";
    const notifyItems = this._notifyServices();
    const mediaItems = this._mediaPlayers();
    this._rules.forEach((rule, idx) => {
      const div = document.createElement("div");
      div.className = "rule";
      const opts = RULE_MATCHES.map(([id, label]) => `<option value="${id}" ${rule.match === id ? "selected" : ""}>${label}</option>`).join("");
      const needsVal = rule.match === "type" || rule.match === "reg";
      const ph = rule.match === "reg" ? "G-XXXX / EI-IHK" : "B38M / 737 MAX 8 / PC-24";
      div.innerHTML = `
        <div class="top">
          <input type="checkbox" class="en" ${rule.enabled !== false ? "checked" : ""}>
          <select class="match">${opts}</select>
          <button type="button" class="rm" title="Remove">×</button>
        </div>
        <input type="text" class="val" placeholder="${ph}" style="${needsVal ? "" : "display:none"}">
        <label>Radius <span class="rval">${rule.radius_nm}</span> NM <input type="range" class="rad" min="5" max="80" value="${rule.radius_nm || 15}"></label>
        <label>Show ring <input type="checkbox" class="ring" ${rule.show_ring ? "checked" : ""}></label>
        <input type="text" class="title" placeholder="Title · ADS-B {match}">
        <input type="text" class="msg" placeholder="Message · {callsign} ({type}) {dist} NM">
        <label>HA notification <input type="checkbox" class="note" ${rule.notify !== false ? "checked" : ""}></label>
        ${this._comboHtml(notifyItems, rule.notify_service || "", "HA notification only", "svc-sel", "svc", "notify.mobile_app_…")}
        <label>Speak <input type="checkbox" class="tts" ${rule.tts ? "checked" : ""}></label>
        <div class="tts-box" style="${rule.tts ? "" : "display:none"}">
          ${this._comboHtml(mediaItems, rule.tts_media || "", "Select speaker", "tts-sel", "ttsmedia", "media_player.xxx")}
        </div>
      `;
      div.querySelector(".val").value = rule.value || "";
      div.querySelector(".title").value = rule.title || "ADS-B {match}";
      div.querySelector(".msg").value = rule.message || "";
      div.querySelector(".svc").value = rule.notify_service || "";
      div.querySelector(".ttsmedia").value = rule.tts_media || "";
      const sync = () => {
        rule.enabled = div.querySelector(".en").checked;
        rule.match = div.querySelector(".match").value;
        rule.value = div.querySelector(".val").value;
        rule.radius_nm = Number(div.querySelector(".rad").value);
        rule.show_ring = div.querySelector(".ring").checked;
        rule.notify = div.querySelector(".note").checked;
        rule.title = div.querySelector(".title").value;
        rule.message = div.querySelector(".msg").value;
        rule.notify_service = this._comboValue(div, "svc-sel", "svc");
        rule.tts = div.querySelector(".tts").checked;
        rule.tts_media = this._comboValue(div, "tts-sel", "ttsmedia");
        div.querySelector(".rval").textContent = String(rule.radius_nm);
        const show = rule.match === "type" || rule.match === "reg";
        div.querySelector(".val").style.display = show ? "" : "none";
        div.querySelector(".val").placeholder = rule.match === "reg" ? "G-XXXX / EI-IHK" : "B38M / 737 MAX 8 / PC-24";
        div.querySelector(".tts-box").style.display = rule.tts ? "" : "none";
        this._drawRings();
      };
      div.querySelectorAll("input, select").forEach((n) => {
        n.addEventListener("input", sync);
        n.addEventListener("change", () => { sync(); this._savePrefs(); });
      });
      this._bindCombo(div, "svc-sel", "svc", () => { sync(); this._savePrefs(); });
      this._bindCombo(div, "tts-sel", "ttsmedia", () => { sync(); this._savePrefs(); });
      div.querySelector(".rm").addEventListener("click", () => {
        this._rules.splice(idx, 1);
        this._renderRules();
        this._savePrefs();
      });
      box.appendChild(div);
    });
  }

  _saveRules() {
    this._savePrefs();
  }

  _savePrefs() {
    this._rulesHydrated = true;
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._flushPrefs(), 350);
  }

  _flushPrefs() {
    const notify = !!(this._$(".notify") && this._$(".notify").checked);
    this._config.alert = { ...(this._config.alert || {}), enabled: notify, rules: this._rules };
    this._drawRings();
    try { localStorage.setItem("adsb_globe_panel", JSON.stringify(this._panel || DEFAULT_PANEL)); } catch (err) { /* ignore */ }
    if (this._hass && this._hass.callService) {
      this._hass.callService("adsb_globe", "set_options", {
        notify,
        rules: JSON.stringify(this._rules || []),
        panel: JSON.stringify(this._panel || DEFAULT_PANEL),
        sources: JSON.stringify(this._sources || []),
        quick_types: JSON.stringify(this._quick || []),
      });
    }
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
    this._map.setView([home.lat, home.lon], 9);
    this._drawRings();
    this._map.on("moveend", () => { this._updateScale(); this._fetch(); });
    this._map.on("zoomend", () => this._updateScale());
    this._map.on("click", () => {
      this._hideHover();
      this._closeSelected();
      if (this._settingsEl) this._settingsEl.classList.remove("open");
    });
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
    (this._rules || []).forEach((rule, i) => {
      if (rule.enabled === false || !rule.show_ring) return;
      const r = Number(rule.radius_nm) || 15;
      const color = RING_COLORS[i % RING_COLORS.length];
      const hot = (this._hotRules || new Set()).has(rule.id);
      L.circle([home.lat, home.lon], {
        radius: r * 1852,
        color,
        weight: hot ? 3 : 2,
        opacity: hot ? 0.95 : 0.7,
        fillColor: color,
        fillOpacity: hot ? 0.12 : 0.05,
        dashArray: hot ? null : "6 5",
        interactive: false,
      }).addTo(this._rings);
    });
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
    if (this._gone || this._paused || !this._map) return;
    const seq = (this._fetchSeq = (this._fetchSeq || 0) + 1);
    const c = this._map.getCenter();
    const b = this._map.getBounds();
    const dist = this._viewDist();
    let data = null;
    try {
      if (this._hass && this._hass.callApi) {
        const q = [
          `lat=${c.lat.toFixed(4)}`,
          `lon=${c.lng.toFixed(4)}`,
          `dist=${dist}`,
          `south=${b.getSouth().toFixed(4)}`,
          `west=${b.getWest().toFixed(4)}`,
          `north=${b.getNorth().toFixed(4)}`,
          `east=${b.getEast().toFixed(4)}`,
        ].join("&");
        data = await Promise.race([
          this._hass.callApi("GET", `adsb_globe/aircraft?${q}`),
          new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 12000)),
        ]);
      }
    } catch (err) {
      data = null;
    }
    if (seq !== this._fetchSeq) return;
    if (!data || !Array.isArray(data.ac || data.aircraft)) {
      if (this._meta && !(this._lastAc && this._lastAc.length)) this._meta.textContent = "feed error";
      if (this._dot && !(this._lastAc && this._lastAc.length)) this._dot.classList.add("off");
      return;
    }
    const incoming = (data.ac || data.aircraft).map(slim).filter(Boolean);
    const ac = this._mergeTraffic(incoming);
    this._lastAc = ac;
    this._lastSource = data.source || "live";
    this._paint({ ac, source: this._lastSource });
  }

  _mergeTraffic(incoming) {
    if (!this._byHex) this._byHex = new Map();
    const now = performance.now();
    for (const ac of incoming) {
      this._byHex.set(ac.hex, { ac, t: now });
    }
    if (!this._map) return incoming;
    let pad;
    try {
      pad = this._map.getBounds().pad(0.25);
    } catch (err) {
      pad = null;
    }
    for (const [hex, rec] of [...this._byHex]) {
      if (hex === this._selected) continue;
      const age = now - rec.t;
      const on = pad ? pad.contains([rec.ac.lat, rec.ac.lon]) : true;
      if (!on) this._byHex.delete(hex);
      else if (age > 30000) this._byHex.delete(hex);
    }
    return [...this._byHex.values()].map((r) => r.ac);
  }

  _iconHtml(ac, sel) {
    const color = ["7500", "7600", "7700"].includes(ac.squawk) ? "#ef5350" : altColor(ac.alt);
    const stroke = sel ? "#fff" : "rgba(0,0,0,.55)";
    const parts = iconParts(ac, color, stroke, sel ? 42 : 34, sel);
    const rot = parts.noRotate ? 0 : (ac.track || 0);
    const size = parts.size;
    const label = this._labels || sel
      ? `<div class="ac-label">${esc(callsign(ac))} ${ac.alt === "ground" ? "gnd" : (ac.alt != null ? Math.round(ac.alt) : "")}</div>`
      : "";
    return {
      size,
      noRotate: parts.noRotate,
      html: `<div class="ac-marker" data-shape="${esc(parts.name)}" style="width:${size}px;height:${size}px;transform:rotate(${rot}deg)">${parts.svg}</div>${label}`,
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

  _liveAc(hex, fallback) {
    return (this._lastAc || []).find((a) => a.hex === hex) || fallback;
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
      const { size, html, noRotate } = this._iconHtml(ac, sel);
      const existing = this._markers.get(ac.hex);
      if (existing) {
        const cur = existing.getLatLng();
        const tLon = shortLon(cur.lng, ac.lon);
        const prev = this._interp.get(ac.hex);
        const dt = prev ? Math.max(400, now - prev.t0) : POLL_MS;
        if (jumpTooFast(cur.lat, cur.lng, ac.lat, tLon, dt, ac.gs)) {
          existing.setLatLng([ac.lat, ac.lon]);
          this._interp.set(ac.hex, { sLat: ac.lat, sLon: ac.lon, tLat: ac.lat, tLon: ac.lon, t0: now });
        } else {
          this._interp.set(ac.hex, {
            sLat: cur.lat, sLon: cur.lng, tLat: ac.lat, tLon, t0: now,
          });
        }
        const el = existing.getElement();
        const mk = el && el.querySelector(".ac-marker");
        if (mk) {
          const color = ["7500", "7600", "7700"].includes(ac.squawk) ? "#ef5350" : altColor(ac.alt);
          if (!noRotate) mk.style.transform = `rotate(${ac.track || 0}deg)`;
          mk.querySelectorAll("path").forEach((path) => {
            if (path.getAttribute("fill") !== "none") path.setAttribute("fill", color);
          });
        } else existing.setIcon(L.divIcon({ className: "ac-icon", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }));
        existing.setZIndexOffset(sel ? 800 : 0);
      } else {
        const marker = L.marker([ac.lat, ac.lon], {
          icon: L.divIcon({ className: "ac-icon", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
          riseOnHover: true,
        }).addTo(this._map);
        const hex = ac.hex;
        marker.on("click", (ev) => {
          L.DomEvent.stopPropagation(ev);
          this._openSelected(this._liveAc(hex, ac));
        });
        marker.on("mouseover", (ev) => this._showHover(this._liveAc(hex, ac), ev));
        marker.on("mouseout", () => this._hideHover());
        this._markers.set(ac.hex, marker);
        this._interp.set(ac.hex, { sLat: ac.lat, sLon: ac.lon, tLat: ac.lat, tLon: ac.lon, t0: now });
      }
      const trail = this._trails[ac.hex] || [];
      const last = trail[trail.length - 1];
      const hop = last ? haversineNm(last[0], last[1], ac.lat, ac.lon) : 0;
      if (!last || hop > 0.03) {
        if (last && hop > 12) this._trails[ac.hex] = [[ac.lat, ac.lon]];
        else {
          trail.push([ac.lat, ac.lon]);
          if (trail.length > 2500) trail.splice(0, trail.length - 2500);
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
    const trail = this._selected ? this._trails[this._selected] : null;
    if (trail && trail.length >= 2) {
      if (this._line) this._line.setLatLngs(trail);
      else this._line = L.polyline(trail, { color: "#80deea", weight: 2.4, opacity: 0.95, interactive: false }).addTo(this._map);
    } else if (this._line) {
      this._map.removeLayer(this._line);
      this._line = null;
    }
    if (this._selected) {
      const ac = list.find((a) => a.hex === this._selected);
      if (ac) {
        if (this._panelHex === ac.hex) this._patchPanel(ac);
        else this._fillPanel(ac);
      } else this._closeSelected();
    }
    if (this._settingsEl && this._settingsEl.classList.contains("open")) this._renderChips();
  }

  _row(label, value, key) {
    if (value == null || value === "") return "";
    return `<div class="row"><span class="k">${label}</span><span${key ? ` data-k="${key}"` : ""}>${esc(value)}</span></div>`;
  }

  _showHover(ac, ev) {
    if (this._selected === ac.hex) return;
    const box = this._$(".hover");
    if (!box) return;
    const alt = ac.alt === "ground" ? "ground" : ac.alt != null ? `${Math.round(ac.alt)} ft` : "n/a";
    box.innerHTML = `<div class="cs">${esc(callsign(ac))}</div>
      <div class="hex">${esc((ac.hex || "").toUpperCase())}</div>
      ${this._row("Reg.:", ac.r || "—")}
      ${this._row("Type code:", ac.t || "—")}
      ${this._row("Altitude:", alt)}
      ${this._row("Speed:", ac.gs != null ? `${Math.round(ac.gs)} kt` : "—")}
      ${this._row("Source:", ac.source || "ADS-B")}
      ${this._row("RSSI:", ac.rssi != null ? `${Number(ac.rssi).toFixed(1)} dBFS` : "—")}`;
    const wrap = this._$(".wrap").getBoundingClientRect();
    const pt = ev && ev.containerPoint ? ev.containerPoint : { x: 80, y: 80 };
    box.style.left = Math.min(pt.x + 18, wrap.width - 230) + "px";
    box.style.top = Math.min(pt.y + 8, wrap.height - 180) + "px";
    box.classList.add("open");
  }

  _hideHover() {
    const box = this._$(".hover");
    if (box) box.classList.remove("open");
  }

  _openSelected(ac) {
    this._hideHover();
    this._selected = ac.hex;
    this._redrawIcons();
    this._fillPanel(ac);
    this._loadExtras(ac);
    if (this._line) { this._map.removeLayer(this._line); this._line = null; }
    const trail = this._trails[ac.hex];
    if (trail && trail.length >= 2) {
      this._line = window.L.polyline(trail, { color: "#80deea", weight: 2.4, opacity: 0.95, interactive: false }).addTo(this._map);
    }
  }

  _closeSelected() {
    this._selected = null;
    this._panelHex = null;
    this._hideHover();
    const panel = this._$(".panel");
    if (panel) { panel.classList.remove("open"); panel.innerHTML = ""; }
    if (this._line && this._map) { this._map.removeLayer(this._line); this._line = null; }
    this._redrawIcons();
  }

  _sec(title, rows) {
    const body = rows.filter(Boolean).join("");
    if (!body) return "";
    return `<h4>${title}</h4>${body}`;
  }

  _fillPanel(ac) {
    const panel = this._$(".panel");
    if (!panel) return;
    const scroll = this._panelHex === ac.hex ? panel.scrollTop : 0;
    const home = this._home();
    const dist = haversineNm(home.lat, home.lon, ac.lat, ac.lon);
    const photo = this._photos && this._photos[ac.hex];
    const cat = CAT_LB[ac.category] || CAT[ac.category] || ac.category || "";
    const nacp = ac.nac_p != null ? (NACP[ac.nac_p] ? `EPU ${NACP[ac.nac_p]}` : ac.nac_p) : null;
    const nacv = ac.nac_v != null ? (NACV[ac.nac_v] || ac.nac_v) : null;
    const sil = ac.sil != null ? (SIL[ac.sil] || ac.sil) : null;
    const ver = ac.version != null ? (ADSB_VER[ac.version] || `v${ac.version}`) : null;
    const nic = ac.nic_baro == null ? null : (Number(ac.nic_baro) ? "cross-checked" : "not cross-checked");
    panel.innerHTML = `
      <button type="button" class="x">✕</button>
      ${photo && photo.src ? `<img class="photo" alt="" src="${esc(photo.src)}">${photo.photographer ? `<div class="cred">Image © ${esc(photo.photographer)}</div>` : ""}` : ""}
      <div class="body">
        <div class="cs">${esc(callsign(ac))}</div>
        <div class="hex">${esc((ac.hex || "").toUpperCase())}</div>
        ${this._row("Reg.:", ac.r || "—")}
        ${this._row("Operator:", ac.ownOp || "")}
        ${this._row("Type:", [ac.t, ac.desc].filter(Boolean).join(" · ") || "—")}
        ${this._row("Squawk:", ac.squawk || "—", "sq")}
        ${this._row("DB flags:", (ac.dbFlags || 0) & 1 ? "military" : "none")}
        ${this._sec("SPATIAL", [
          this._row("Groundspeed:", fmt(ac.gs, 0, " kt"), "gs"),
          this._row("Baro. altitude:", ac.alt === "ground" ? "ground" : fmt(ac.alt, 0, " ft"), "alt"),
          this._row("WGS84 altitude:", fmt(ac.alt_geom, 0, " ft"), "altg"),
          this._row("Vert. Rate:", fmt(ac.baro_rate, 0, " ft/min"), "vs"),
          this._row("Track:", fmt(ac.track, 1, "°"), "trk"),
          this._row("Pos.:", `${ac.lat.toFixed(3)}, ${ac.lon.toFixed(3)}`, "pos"),
          this._row("Distance:", `${dist.toFixed(1)} NM`, "dst"),
        ])}
        ${this._sec("SIGNAL", [
          this._row("Source:", ac.source || "ADS-B"),
          this._row("RSSI:", ac.rssi != null ? `${Number(ac.rssi).toFixed(1)} dBFS` : null, "rssi"),
          this._row("Messages:", ac.messages),
          this._row("Last Pos.:", fmt(ac.seen_pos, 1, " s"), "seenp"),
          this._row("Last Seen:", fmt(ac.seen, 1, " s"), "seen"),
        ])}
        ${this._sec("FMS SEL", [
          this._row("Sel. Alt.:", fmt(ac.nav_altitude_mcp, 0, " ft")),
          this._row("Sel. Head.:", fmt(ac.nav_heading, 1, "°")),
        ])}
        ${this._sec("WIND", [
          this._row("Speed:", fmt(ac.ws, 0, " kt")),
          this._row("Direction (from):", fmt(ac.wd, 0, "°")),
          this._row("TAT / OAT:", (ac.tat != null || ac.oat != null) ? `${ac.tat ?? "—"} / ${ac.oat ?? "—"} °C` : null),
        ])}
        ${this._sec("SPEED", [
          this._row("Ground:", fmt(ac.gs, 0, " kt"), "gs2"),
          this._row("True:", fmt(ac.tas, 0, " kt")),
          this._row("Indicated:", fmt(ac.ias, 0, " kt")),
          this._row("Mach:", fmt(ac.mach, 3, "")),
        ])}
        ${this._sec("ALTITUDE", [
          this._row("Barometric:", ac.alt === "ground" ? "ground" : fmt(ac.alt, 0, " ft"), "alt2"),
          this._row("Baro. Rate:", fmt(ac.baro_rate, 0, " ft/min"), "vs2"),
          this._row("Geom. WGS84:", fmt(ac.alt_geom, 0, " ft"), "altg2"),
          this._row("Geom. Rate:", fmt(ac.geom_rate, 0, " ft/min")),
          this._row("QNH:", fmt(ac.nav_qnh, 1, " hPa")),
        ])}
        ${this._sec("DIRECTION", [
          this._row("Ground Track:", fmt(ac.track, 1, "°"), "trk2"),
          this._row("True Heading:", fmt(ac.true_heading, 1, "°")),
          this._row("Magnetic Heading:", fmt(ac.mag_heading, 1, "°")),
          this._row("Track Rate:", fmt(ac.track_rate, 2, "")),
          this._row("Roll:", fmt(ac.roll, 1, "")),
        ])}
        ${this._sec("STUFF", [
          this._row("Category:", cat),
          this._row("ADS-B Ver.:", ver),
          this._row("DB flags:", (ac.dbFlags || 0) & 1 ? "military" : "none"),
        ])}
        ${this._sec("ACCURACY", [
          this._row("NACp:", nacp),
          this._row("SIL:", sil),
          this._row("NACv:", nacv),
          this._row("NICBARO:", nic),
          this._row("Rc:", ac.rc != null ? `${ac.rc} m` : null),
        ])}
      </div>`;
    panel.classList.add("open");
    this._panelHex = ac.hex;
    panel.scrollTop = scroll;
  }

  _patchPanel(ac) {
    const panel = this._$(".panel");
    if (!panel || this._panelHex !== ac.hex) return;
    const home = this._home();
    const dist = haversineNm(home.lat, home.lon, ac.lat, ac.lon);
    const set = (k, v) => {
      const n = panel.querySelector(`[data-k="${k}"]`);
      if (n && v != null && v !== "") n.textContent = v;
    };
    set("gs", fmt(ac.gs, 0, " kt"));
    set("gs2", fmt(ac.gs, 0, " kt"));
    set("alt", ac.alt === "ground" ? "ground" : fmt(ac.alt, 0, " ft"));
    set("alt2", ac.alt === "ground" ? "ground" : fmt(ac.alt, 0, " ft"));
    set("altg", fmt(ac.alt_geom, 0, " ft"));
    set("altg2", fmt(ac.alt_geom, 0, " ft"));
    set("vs", fmt(ac.baro_rate, 0, " ft/min"));
    set("vs2", fmt(ac.baro_rate, 0, " ft/min"));
    set("trk", fmt(ac.track, 1, "°"));
    set("trk2", fmt(ac.track, 1, "°"));
    set("pos", `${ac.lat.toFixed(3)}, ${ac.lon.toFixed(3)}`);
    set("dst", `${dist.toFixed(1)} NM`);
    set("rssi", ac.rssi != null ? `${Number(ac.rssi).toFixed(1)} dBFS` : null);
    set("seen", fmt(ac.seen, 1, " s"));
    set("seenp", fmt(ac.seen_pos, 1, " s"));
    set("sq", ac.squawk || "—");
  }

  async _loadExtras(ac) {
    if (!this._hass || !this._hass.callApi) return;
    this._photos = this._photos || {};
    try {
      const photo = await this._hass.callApi("GET", `adsb_globe/photo?hex=${ac.hex}`);
      if (photo && photo.photo) {
        this._photos[ac.hex] = photo.photo;
        if (this._selected === ac.hex) this._fillPanel(ac);
      }
    } catch (err) { /* ignore */ }
    try {
      const trace = await this._hass.callApi("GET", `adsb_globe/trace?hex=${ac.hex}`);
      const pts = (trace && trace.points) || [];
      if (pts.length >= 2) {
        this._trails[ac.hex] = pts.map((p) => [p[0], p[1]]);
        if (this._selected === ac.hex && this._map) {
          if (this._line) this._map.removeLayer(this._line);
          this._line = window.L.polyline(this._trails[ac.hex], { color: "#80deea", weight: 2.4, opacity: 0.95, interactive: false }).addTo(this._map);
        }
      }
    } catch (err) { /* ignore */ }
  }

  _runAlerts(list) {
    const home = this._home();
    const hot = new Set();
    for (const rule of (this._rules || [])) {
      if (rule.enabled === false) continue;
      const r = Number(rule.radius_nm) || 15;
      for (const ac of list) {
        if (!matchRule(ac, rule)) continue;
        if (haversineNm(home.lat, home.lon, ac.lat, ac.lon) <= r) hot.add(rule.id);
      }
    }
    const prevHot = this._hotRules || new Set();
    this._hotRules = hot;
    if ([...hot].join() !== [...prevHot].join()) this._drawRings();
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
