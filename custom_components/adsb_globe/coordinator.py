from __future__ import annotations

from datetime import timedelta
import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import CONF_ALERT_RADIUS, CONF_FEEDER_URL, DEFAULT_ALERT_RADIUS, DEFAULT_SCAN_INTERVAL, DOMAIN
from .feed import classify, haversine_nm, home_fix, pull_feeder, pull_public

_LOGGER = logging.getLogger(__name__)


class AdsbCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=DEFAULT_SCAN_INTERVAL),
        )
        self.entry = entry

    def _opts(self) -> dict[str, Any]:
        return {**self.entry.data, **self.entry.options}

    async def _async_update_data(self) -> dict[str, Any]:
        opts = self._opts()
        lat, lon = home_fix(self.hass)
        radius = int(opts.get(CONF_ALERT_RADIUS, DEFAULT_ALERT_RADIUS))
        feeder = (opts.get(CONF_FEEDER_URL) or "").strip()
        try:
            if feeder:
                feed = await pull_feeder(self.hass, feeder)
            else:
                feed = await pull_public(self.hass, lat, lon, max(radius * 2, 40))
        except Exception as err:
            raise UpdateFailed(str(err)) from err

        alerts: dict[str, list[dict[str, Any]]] = {
            "military": [],
            "helicopter": [],
            "chinook": [],
            "apache": [],
            "blackhawk": [],
            "police": [],
            "fighter": [],
            "emergency": [],
        }
        nearest = None
        nearest_d = 1e9
        airborne = 0
        for ac in feed["ac"]:
            if ac.get("alt") != "ground":
                airborne += 1
            d = ac.get("dst")
            if d is None:
                d = haversine_nm(lat, lon, ac["lat"], ac["lon"])
            ac["dst"] = d
            if d < nearest_d:
                nearest_d = d
                nearest = ac
            if d > radius:
                continue
            for kind in classify(ac):
                alerts[kind].append(ac)

        return {
            "lat": lat,
            "lon": lon,
            "radius": radius,
            "count": len(feed["ac"]),
            "airborne": airborne,
            "source": feed.get("source"),
            "nearest": nearest,
            "alerts": alerts,
            "ac": feed["ac"],
        }
