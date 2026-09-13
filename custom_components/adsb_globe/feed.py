from __future__ import annotations

import logging
import math
from typing import Any

from aiohttp import ClientError, ClientTimeout
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import MAX_DIST_NM, PROVIDERS

_LOGGER = logging.getLogger(__name__)
_TIMEOUT = ClientTimeout(total=8)
_TRACE_TIMEOUT = ClientTimeout(total=6)
_UA = "HomeAssistant-ADS-B-Globe/1.3 (+https://github.com/OnChainPunk/ha-adsb-globe)"


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
    }
    for key, val in repl.items():
        text = text.replace(key, val)
    return text


async def pull_public(hass: HomeAssistant, lat: float, lon: float, dist: float) -> dict[str, Any]:
    dist = max(8, min(MAX_DIST_NM, float(dist)))
    session = async_get_clientsession(hass)
    last = "No provider answered"
    for tmpl in PROVIDERS:
        url = tmpl.format(lat=lat, lon=lon, dist=int(dist))
        try:
            async with session.get(url, timeout=_TIMEOUT, headers={"User-Agent": _UA, "Accept": "application/json"}) as resp:
                if resp.status in (403, 429) or resp.status >= 500:
                    last = f"{url} {resp.status}"
                    continue
                if resp.status != 200:
                    last = f"{url} {resp.status}"
                    continue
                data = await resp.json(content_type=None)
                ac = [s for s in (slim(x) for x in (data.get("ac") or [])) if s]
                return {"ac": ac, "total": data.get("total", len(ac)), "source": url.split("/")[2]}
        except (ClientError, TimeoutError, ValueError) as err:
            last = str(err)
    raise RuntimeError(last)


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
