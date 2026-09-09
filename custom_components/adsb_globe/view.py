from __future__ import annotations

import logging
from typing import Any

from aiohttp.web import Request, Response
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .const import CONF_FEEDER_URL, DOMAIN, MAX_DIST_NM
from .feed import home_fix, pull_feeder, pull_public

_LOGGER = logging.getLogger(__name__)


class AdsbFeedView(HomeAssistantView):
    """Authenticated proxy so the Lovelace card can poll at ~1 Hz like tar1090."""

    url = "/api/adsb_globe/aircraft"
    name = "api:adsb_globe:aircraft"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: Request) -> Response:
        try:
            lat = float(request.query.get("lat") or 0)
            lon = float(request.query.get("lon") or 0)
            dist = float(request.query.get("dist") or 80)
        except ValueError:
            return self.json({"error": "bad query"}, status_code=400)

        if not lat and not lon:
            lat, lon = home_fix(self.hass)

        dist = max(8, min(MAX_DIST_NM, dist))
        feeder = ""
        for entry in self.hass.config_entries.async_entries(DOMAIN):
            feeder = (entry.options.get(CONF_FEEDER_URL) or entry.data.get(CONF_FEEDER_URL) or "").strip()
            break

        try:
            if feeder:
                data: dict[str, Any] = await pull_feeder(self.hass, feeder)
            else:
                data = await pull_public(self.hass, lat, lon, dist)
        except Exception as err:
            _LOGGER.warning("ADS-B feed failed: %s", err)
            return self.json({"ac": [], "total": 0, "source": "", "error": str(err)}, status_code=502)
        return self.json(data)
