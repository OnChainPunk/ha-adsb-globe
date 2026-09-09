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
_UA = "HomeAssistant-ADS-B-Globe/1.0 (+https://github.com/OnChainPunk/ha-adsb-globe)"


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
    return {
        "hex": hex_id,
        "flight": str(raw.get("flight") or "").strip(),
        "r": str(raw.get("r") or "").strip(),
        "t": str(raw.get("t") or "").strip(),
        "alt": alt_out,
        "gs": raw.get("gs"),
        "track": raw.get("track"),
        "squawk": str(raw.get("squawk") or "").strip(),
        "category": raw.get("category") or "",
        "lat": float(lat),
        "lon": float(lon),
        "seen": raw.get("seen") or 0,
        "dbFlags": raw.get("dbFlags") or 0,
        "emergency": raw.get("emergency") if raw.get("emergency") not in (None, "none") else "",
        "dst": raw.get("dst"),
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
