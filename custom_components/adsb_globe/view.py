"""Same-origin aircraft feed for the Lovelace card."""

from __future__ import annotations

from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .feed import pull_public


class AdsbAircraftView(HomeAssistantView):
    url = "/api/adsb_globe/aircraft"
    name = "api:adsb_globe:aircraft"
    requires_auth = True

    async def get(self, request):
        hass: HomeAssistant = request.app["hass"]
        try:
            lat = float(request.query["lat"])
            lon = float(request.query["lon"])
            dist = float(request.query.get("dist") or 40)
        except (KeyError, TypeError, ValueError):
            return self.json({"error": "lat, lon required"}, status_code=400)
        try:
            data = await pull_public(hass, lat, lon, dist)
        except Exception as err:  # noqa: BLE001
            return self.json({"error": str(err), "ac": []}, status_code=502)
        return self.json(data)
