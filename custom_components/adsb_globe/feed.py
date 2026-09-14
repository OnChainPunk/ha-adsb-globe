from __future__ import annotations

import asyncio
import logging
import json
import math
import time
from typing import Any

from aiohttp import ClientError, ClientTimeout
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import DEFAULT_SOURCES, DOMAIN, MAX_DIST_NM, MAX_VIEW_TILES

_LOGGER = logging.getLogger(__name__)
_TIMEOUT = ClientTimeout(total=8)
_TRACE_TIMEOUT = ClientTimeout(total=6)
_UA = "HomeAssistant-ADS-B-Globe/1.6 (+https://github.com/OnChainPunk/ha-adsb-globe)"


def haversine_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 3440.065
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


def home_fix(hass: HomeAssistant) -> tuple[float, float]:
    zone = hass.states.get("zone.home")
    if zone and zone.attributes.get("latitude") is not None:
        return float(zone.attributes["latitude"]), float(zone.attributes["longitude"])
    return 40.6413, -73.7781


def _num(value: Any) -> float | int | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return value
    return None


def _norm(value: Any) -> str:
    return "".join(ch for ch in str(value or "").upper() if ch.isalnum())


def slim(raw: dict[str, Any]) -> dict[str, Any] | None:
    hex_id = str(raw.get("hex") or "").lower()
    lat, lon = raw.get("lat"), raw.get("lon")
    if not hex_id or lat is None or lon is None:
        return None
    alt = raw.get("alt_baro")
    if alt == "ground":
        alt_out: int | str | None = "ground"
    elif isinstance(alt, (int, float)):
        alt_out = int(alt)
    else:
        alt_out = None
    mlat = raw.get("mlat") or []
    source = "MLAT" if mlat else "ADS-B"
    return {
        "hex": hex_id,
        "flight": str(raw.get("flight") or "").strip(),
        "r": str(raw.get("r") or "").strip(),
        "t": str(raw.get("t") or "").strip(),
        "desc": str(raw.get("desc") or "").strip(),
        "ownOp": str(raw.get("ownOp") or "").strip(),
        "year": raw.get("year") or "",
        "alt": alt_out,
        "alt_geom": _num(raw.get("alt_geom")),
        "gs": _num(raw.get("gs")),
        "tas": _num(raw.get("tas")),
        "ias": _num(raw.get("ias")),
        "mach": _num(raw.get("mach")),
        "track": _num(raw.get("track")),
        "mag_heading": _num(raw.get("mag_heading")),
        "true_heading": _num(raw.get("true_heading")),
        "track_rate": _num(raw.get("track_rate")),
        "roll": _num(raw.get("roll")),
        "baro_rate": _num(raw.get("baro_rate")),
        "geom_rate": _num(raw.get("geom_rate")),
        "squawk": str(raw.get("squawk") or "").strip(),
        "category": raw.get("category") or "",
        "lat": float(lat),
        "lon": float(lon),
        "seen": _num(raw.get("seen")) or 0,
        "seen_pos": _num(raw.get("seen_pos")),
        "rssi": _num(raw.get("rssi")),
        "messages": raw.get("messages"),
        "dbFlags": raw.get("dbFlags") or 0,
        "emergency": raw.get("emergency") if raw.get("emergency") not in (None, "none") else "",
        "dst": raw.get("dst"),
        "nav_qnh": _num(raw.get("nav_qnh")),
        "nav_altitude_mcp": _num(raw.get("nav_altitude_mcp")),
        "nav_heading": _num(raw.get("nav_heading")),
        "wd": _num(raw.get("wd")),
        "ws": _num(raw.get("ws")),
        "oat": _num(raw.get("oat")),
        "tat": _num(raw.get("tat")),
        "nac_p": _num(raw.get("nac_p")),
        "nac_v": _num(raw.get("nac_v")),
        "sil": _num(raw.get("sil")),
        "nic_baro": raw.get("nic_baro"),
        "rc": _num(raw.get("rc")),
        "version": raw.get("version"),
        "source": source,
    }


def classify(ac: dict[str, Any]) -> list[str]:
    t = str(ac.get("t") or "").upper()
    flight = str(ac.get("flight") or "").upper().replace(" ", "")
    kinds: list[str] = []
    sq = str(ac.get("squawk") or "")
    if sq in {"7500", "7600", "7700"} or ac.get("emergency"):
        kinds.append("emergency")
    if t in {"H47", "CH47", "CH47D", "CH47F", "MH47", "MH47G"}:
        kinds.append("chinook")
    if t in {"H64", "AH64", "AH64A", "AH64D", "AH64E"}:
        kinds.append("apache")
    if t in {"H60", "UH60", "UH60L", "UH60M", "HH60", "SH60", "S70", "S70A", "S70I"}:
        kinds.append("blackhawk")
    if t in {"F16", "F16C", "F18", "F18H", "F18S", "F22", "F35", "F35A", "F35B", "F35C", "F15", "F15E", "A10", "EUFI", "TYPH", "RAFA"}:
        kinds.append("fighter")
    if ac.get("category") == "A7" or t in {"H47", "CH47", "H64", "AH64", "H60", "UH60", "A139", "EC35", "EC45", "B06", "R44", "S92"}:
        kinds.append("helicopter")
    if flight.startswith(("UKP", "NPOL", "POLICE", "GEND", "SHRF", "CHP")) or "POLICE" in flight:
        kinds.append("police")
    if int(ac.get("dbFlags") or 0) & 1:
        kinds.append("military")
    return kinds


def match_rule(ac: dict[str, Any], rule: dict[str, Any]) -> bool:
    if not rule.get("enabled", True):
        return False
    kind = str(rule.get("match") or "")
    value = str(rule.get("value") or "").strip().upper()
    kinds = classify(ac)
    if kind == "type":
        if not value:
            return False
        t = str(ac.get("t") or "").upper()
        desc = str(ac.get("desc") or "").upper()
        want = _norm(value)
        return t == value or value in desc or (bool(want) and (_norm(t) == want or want in _norm(desc)))
    if kind == "reg":
        reg = _norm(ac.get("r"))
        want = _norm(value)
        return bool(want) and (reg == want or reg.startswith(want))
    return kind in kinds


def format_alert(template: str, ac: dict[str, Any], rule: dict[str, Any], dist: float) -> str:
    label = ac.get("flight") or ac.get("r") or ac.get("hex")
    text = template or "{callsign} ({type}) {match} {dist} NM"
    repl = {
        "{callsign}": str(label or ""),
        "{type}": str(ac.get("t") or "?"),
        "{reg}": str(ac.get("r") or ""),
        "{hex}": str(ac.get("hex") or ""),
        "{dist}": f"{dist:.1f}",
        "{match}": str(rule.get("match") or "alert"),
        "{alt}": "" if ac.get("alt") is None else str(ac.get("alt")),
        "{value}": str(rule.get("value") or ""),
        "{desc}": str(ac.get("desc") or ""),
        "{operator}": str(ac.get("ownOp") or ""),
        "{gs}": "" if ac.get("gs") is None else str(int(ac.get("gs"))),
        "{squawk}": str(ac.get("squawk") or ""),
        "{flight}": str(ac.get("flight") or label or ""),
    }
    for key, val in repl.items():
        text = text.replace(key, val)
    return text


async def pull_public(hass: HomeAssistant, lat: float, lon: float, dist: float) -> dict[str, Any]:
    return await pull_from_sources(hass, lat, lon, dist, list(DEFAULT_SOURCES))


async def _get_json(hass: HomeAssistant, url: str) -> dict[str, Any]:
    session = async_get_clientsession(hass)
    async with session.get(url, timeout=_TIMEOUT, headers={"User-Agent": _UA, "Accept": "application/json"}) as resp:
        if resp.status in (403, 429) or resp.status >= 500:
            raise RuntimeError(f"{url} {resp.status}")
        if resp.status != 200:
            raise RuntimeError(f"{url} {resp.status}")
        data = await resp.json(content_type=None)
        if not isinstance(data, dict):
            raise RuntimeError(f"{url} not json object")
        return data


def _clamp_interval(raw: Any) -> float:
    try:
        n = float(raw)
    except (TypeError, ValueError):
        n = 1.0
    return max(0.5, min(30.0, n))


def _as_sources(raw: Any) -> list[dict[str, Any]]:
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            raw = None
    if raw is None or not isinstance(raw, list):
        return [dict(s) for s in DEFAULT_SOURCES]
    out = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        url = str(item.get("url") or "").strip()
        if not url.lower().startswith(("http://", "https://")):
            continue
        host = url.split("/")[2] if "://" in url else url
        out.append(
            {
                "id": str(item.get("id") or url)[:80],
                "label": str(item.get("label") or host)[:80],
                "url": url[:500],
                "enabled": item.get("enabled", True) is not False,
                "interval": _clamp_interval(item.get("interval", 1)),
            }
        )
    return out


def plan_tiles(
    lat: float,
    lon: float,
    dist: float,
    bounds: tuple[float, float, float, float] | None,
    max_tiles: int = MAX_VIEW_TILES,
) -> list[tuple[float, float, int]]:
    """Cover the viewport with overlapping 250 NM circles.

    Public aggregators (adsb.lol / adsb.fi) cap a single request at 250 NM.
    tar1090/ADS-B Exchange load globe tiles instead of one circle around the
    camera, so aircraft stay at true lat/lon when the map pans.
    """
    dist = max(8, min(MAX_DIST_NM, float(dist)))
    center = (round(lat, 3), round(lon, 3), int(dist))
    if not bounds:
        return [center]
    south, west, north, east = bounds
    south = max(-85.0, min(85.0, float(south)))
    north = max(-85.0, min(85.0, float(north)))
    if north <= south:
        north = min(85.0, south + 0.5)
    west = float(west)
    east = float(east)
    if east < west:
        east += 360.0
    mid_lat = (south + north) / 2.0
    coslat = max(0.2, math.cos(math.radians(mid_lat)))
    span_lat_nm = (north - south) * 60.0
    span_lon_nm = (east - west) * 60.0 * coslat
    half = math.hypot(span_lat_nm / 2.0, span_lon_nm / 2.0)
    if half <= 230:
        return [(round(lat, 3), round(lon, 3), int(min(MAX_DIST_NM, max(dist, half * 1.05))))]

    tile_nm = 210.0
    step_lat = (tile_nm * 0.88) / 60.0
    step_lon = (tile_nm * 0.88) / (60.0 * coslat)
    lats: list[float] = []
    y = south + step_lat * 0.45
    while y < north and len(lats) < 4:
        lats.append(y)
        y += step_lat
    if not lats:
        lats = [lat]
    lons: list[float] = []
    x = west + step_lon * 0.45
    while x < east and len(lons) < 4:
        lons.append(x)
        x += step_lon
    if not lons:
        lons = [lon]

    pts: list[tuple[float, float, int]] = []
    seen: set[tuple[float, float]] = set()

    def add(la: float, lo: float) -> None:
        la_r = round(la, 3)
        lo_n = ((lo + 180.0) % 360.0) - 180.0
        lo_r = round(lo_n, 3)
        key = (la_r, lo_r)
        if key in seen:
            return
        seen.add(key)
        pts.append((la_r, lo_r, MAX_DIST_NM))

    add(lat, lon)
    for la in lats:
        for lo in lons:
            add(la, lo)
            if len(pts) >= max_tiles:
                return pts
    return pts or [center]


def _feed_state(hass: HomeAssistant) -> dict[str, Any]:
    bucket = hass.data.setdefault(DOMAIN, {}).setdefault("_feed", {})
    bucket.setdefault("cache", {})
    bucket.setdefault("locks", {})
    bucket.setdefault("last_http", {})
    bucket.setdefault("pending", set())
    return bucket


def _tile_key(src_id: str, lat: float, lon: float, templated: bool) -> str:
    if not templated:
        return f"{src_id}:all"
    return f"{src_id}:{lat:.3f}:{lon:.3f}"


def _parse_tile_key(key: str) -> tuple[str, float, float] | None:
    if key.endswith(":all"):
        return None
    src_id, _, rest = key.partition(":")
    try:
        lat_s, lon_s = rest.rsplit(":", 1)
        return src_id, float(lat_s), float(lon_s)
    except (ValueError, TypeError):
        return None


def _ac_in_view(ac: dict[str, Any], bounds: tuple[float, float, float, float] | None, pad_deg: float = 1.6) -> bool:
    if not bounds:
        return True
    south, west, north, east = bounds
    la = ac["lat"]
    lo = ac["lon"]
    if la < south - pad_deg or la > north + pad_deg:
        return False
    if east >= west:
        return west - pad_deg <= lo <= east + pad_deg
    return lo >= west - pad_deg or lo <= east + pad_deg


def _prune_cache(cache: dict[str, Any], now: float) -> None:
    stale = [k for k, rec in cache.items() if now - rec.get("t", 0) > 90]
    for k in stale:
        cache.pop(k, None)
    if len(cache) <= 48:
        return
    by_age = sorted(cache.items(), key=lambda kv: kv[1].get("t", 0))
    for k, _ in by_age[: len(cache) - 48]:
        cache.pop(k, None)


def _merge_ac(merged: dict[str, dict[str, Any]], rows: list[dict[str, Any]], label: str) -> int:
    got = 0
    for ac in rows:
        prev = merged.get(ac["hex"])
        if prev is None or (ac.get("seen") or 9e9) <= (prev.get("seen") or 9e9):
            ac = dict(ac)
            ac["source"] = label
            merged[ac["hex"]] = ac
            got += 1
    return got


async def _load_tile(
    hass: HomeAssistant,
    src: dict[str, Any],
    lat: float,
    lon: float,
    dist: float,
) -> dict[str, Any] | None:
    templated = "{lat}" in src["url"]
    key = _tile_key(src["id"], lat, lon, templated)
    state = _feed_state(hass)
    cache: dict[str, Any] = state["cache"]
    locks: dict[str, asyncio.Lock] = state["locks"]
    last_http: dict[str, float] = state["last_http"]
    lock = locks.setdefault(src["id"], asyncio.Lock())
    interval = _clamp_interval(src.get("interval", 1))
    now = time.monotonic()
    rec = cache.get(key)
    if rec and now - rec["t"] < interval:
        return rec
    async with lock:
        now = time.monotonic()
        rec = cache.get(key)
        if rec and now - rec["t"] < interval:
            return rec
        wait = interval - (now - last_http.get(src["id"], 0.0))
        if wait > 0:
            await asyncio.sleep(min(wait, 8.0))
        url = src["url"]
        if not url.lower().startswith(("http://", "https://")):
            return rec
        if templated:
            url = (
                url.replace("{lat}", str(lat))
                .replace("{lon}", str(lon))
                .replace("{dist}", str(int(dist)))
            )
        try:
            data = await _get_json(hass, url)
            rows = []
            for raw in data.get("ac") or data.get("aircraft") or []:
                ac = slim(raw)
                if ac:
                    rows.append(ac)
            rec = {
                "t": time.monotonic(),
                "ac": rows,
                "label": str(src.get("label") or src["id"]),
            }
            cache[key] = rec
            last_http[src["id"]] = rec["t"]
            return rec
        except (ClientError, TimeoutError, ValueError, RuntimeError) as err:
            last_http[src["id"]] = time.monotonic()
            if "429" in str(err) or "403" in str(err):
                if rec:
                    rec = dict(rec)
                    rec["t"] = time.monotonic()
                    cache[key] = rec
            _LOGGER.debug("tile %s failed: %s", key, err)
            return rec


async def _refresh_tile_bg(hass: HomeAssistant, src: dict[str, Any], lat: float, lon: float, dist: float) -> None:
    state = _feed_state(hass)
    templated = "{lat}" in src["url"]
    key = _tile_key(src["id"], lat, lon, templated)
    pending: set[str] = state["pending"]
    if key in pending:
        return
    pending.add(key)
    try:
        await _load_tile(hass, src, lat, lon, dist)
    except Exception as err:  # noqa: BLE001
        _LOGGER.debug("bg tile %s: %s", key, err)
    finally:
        pending.discard(key)


async def pull_from_sources(
    hass: HomeAssistant,
    lat: float,
    lon: float,
    dist: float,
    sources: Any,
    bounds: tuple[float, float, float, float] | None = None,
) -> dict[str, Any]:
    dist = max(8, min(MAX_DIST_NM, float(dist)))
    parsed = _as_sources(sources)
    enabled = [s for s in parsed if s.get("enabled", True)]
    if not enabled:
        raise RuntimeError("No data sources enabled")
    tiles = plan_tiles(lat, lon, dist, bounds)
    state = _feed_state(hass)
    cache: dict[str, Any] = state["cache"]
    _prune_cache(cache, time.monotonic())

    # Wait only for each source's centre tile (or its whole-file feeder).
    # Extra viewport tiles fill from cache and refresh in the background so
    # a pan cannot wipe aircraft that still sit in view — same idea as tar1090
    # globe tiles.
    centre_jobs = []
    for src in enabled:
        tlat, tlon, tdist = tiles[0]
        centre_jobs.append(_load_tile(hass, src, tlat, tlon, tdist))
    centre_out = await asyncio.gather(*centre_jobs, return_exceptions=True)

    merged: dict[str, dict[str, Any]] = {}
    names: list[str] = []
    last = "No source answered"
    for src, rec in zip(enabled, centre_out):
        templated = "{lat}" in src["url"]
        src_tiles = tiles if templated else [tiles[0]]
        if isinstance(rec, Exception):
            last = str(rec)
        elif rec and rec.get("label"):
            names.append(str(rec["label"]))
        bg = 0
        scheduled = set()
        for tlat, tlon, tdist in src_tiles:
            key = _tile_key(src["id"], tlat, tlon, templated)
            cached = cache.get(key)
            interval = _clamp_interval(src.get("interval", 1))
            fresh = cached and time.monotonic() - cached["t"] < interval
            if cached:
                _merge_ac(merged, cached.get("ac") or [], cached.get("label") or src["id"])
            if not fresh and (tlat, tlon) != (src_tiles[0][0], src_tiles[0][1]):
                hass.async_create_task(_refresh_tile_bg(hass, src, tlat, tlon, tdist))
                scheduled.add(key)
                bg += 1
        # Keep tiles that still overlap this view (e.g. UK after panning east).
        if templated:
            interval = _clamp_interval(src.get("interval", 1))
            for key, cached in list(cache.items()):
                parsed = _parse_tile_key(key)
                if not parsed or parsed[0] != src["id"] or key in scheduled:
                    continue
                _, tlat, tlon = parsed
                if bounds and not _ac_in_view({"lat": tlat, "lon": tlon}, bounds, pad_deg=4.2):
                    continue
                _merge_ac(merged, cached.get("ac") or [], cached.get("label") or src["id"])
                if time.monotonic() - cached["t"] >= interval and bg < 4:
                    hass.async_create_task(_refresh_tile_bg(hass, src, tlat, tlon, MAX_DIST_NM))
                    bg += 1
        else:
            key = _tile_key(src["id"], 0, 0, False)
            cached = cache.get(key)
            if cached:
                _merge_ac(merged, cached.get("ac") or [], cached.get("label") or src["id"])

    if bounds:
        merged = {h: ac for h, ac in merged.items() if _ac_in_view(ac, bounds)}
    if not merged:
        raise RuntimeError(last)
    seen_names = []
    for n in names:
        if n not in seen_names:
            seen_names.append(n)
    return {
        "ac": list(merged.values()),
        "total": len(merged),
        "source": "+".join(seen_names) or "none",
        "tiles": len(tiles),
    }



async def pull_feeder(hass: HomeAssistant, feeder_url: str) -> dict[str, Any]:
    session = async_get_clientsession(hass)
    async with session.get(feeder_url, timeout=_TIMEOUT, headers={"User-Agent": _UA, "Accept": "application/json"}) as resp:
        resp.raise_for_status()
        data = await resp.json(content_type=None)
        ac = [s for s in (slim(x) for x in (data.get("ac") or data.get("aircraft") or [])) if s]
        return {"ac": ac, "total": data.get("total", len(ac)), "source": "feeder"}


def _parse_trace(data: Any) -> list[list[float]]:
    rows = []
    if isinstance(data, dict):
        trace = data.get("trace") or data.get("states") or []
    elif isinstance(data, list):
        trace = data
    else:
        return rows
    for row in trace:
        if not isinstance(row, (list, tuple)) or len(row) < 3:
            continue
        lat = row[1]
        lon = row[2]
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            continue
        alt = row[3] if len(row) > 3 and isinstance(row[3], (int, float)) else None
        rows.append([float(lat), float(lon)] if alt is None else [float(lat), float(lon), float(alt)])
    return rows


async def pull_trace(hass: HomeAssistant, hex_id: str) -> dict[str, Any]:
    hex_id = hex_id.lower().strip()
    suffix = hex_id[-2:]
    session = async_get_clientsession(hass)
    urls = [
        f"https://globe.adsb.lol/data/traces/{suffix}/trace_recent_{hex_id}.json",
        f"https://api.adsb.lol/data/traces/{suffix}/trace_recent_{hex_id}.json",
        f"https://opendata.adsb.fi/data/traces/{suffix}/trace_recent_{hex_id}.json",
        f"https://globe.adsb.lol/data/traces/{suffix}/trace_full_{hex_id}.json",
        f"https://opendata.adsb.fi/globe_history/traces/{suffix}/trace_recent_{hex_id}.json",
    ]
    for url in urls:
        try:
            async with session.get(url, timeout=_TRACE_TIMEOUT, headers={"User-Agent": _UA, "Accept": "application/json"}) as resp:
                if resp.status != 200:
                    continue
                data = await resp.json(content_type=None)
                points = _parse_trace(data)
                if points:
                    return {"hex": hex_id, "points": points, "source": url.split("/")[2]}
        except (ClientError, TimeoutError, ValueError):
            continue
    return {"hex": hex_id, "points": [], "source": None}


async def pull_photo(hass: HomeAssistant, hex_id: str) -> dict[str, Any]:
    hex_id = hex_id.lower().strip()
    session = async_get_clientsession(hass)
    url = f"https://api.planespotters.net/pub/photos/hex/{hex_id}"
    try:
        async with session.get(url, timeout=_TRACE_TIMEOUT, headers={"User-Agent": _UA, "Accept": "application/json"}) as resp:
            if resp.status != 200:
                return {"hex": hex_id, "photo": None}
            data = await resp.json(content_type=None)
    except (ClientError, TimeoutError, ValueError):
        return {"hex": hex_id, "photo": None}
    photos = data.get("photos") or []
    if not photos:
        return {"hex": hex_id, "photo": None}
    first = photos[0]
    thumb = first.get("thumbnail_large") or first.get("thumbnail") or {}
    return {
        "hex": hex_id,
        "photo": {
            "src": thumb.get("src") or first.get("thumbnail", {}).get("src"),
            "link": first.get("link"),
            "photographer": first.get("photographer"),
        },
    }
