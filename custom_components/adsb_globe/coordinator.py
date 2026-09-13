from __future__ import annotations

from datetime import timedelta
import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_LATITUDE, CONF_LONGITUDE, CONF_SCAN_INTERVAL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import (
    CONF_ALERT_RADIUS,
    CONF_FEEDER_URL,
    CONF_NOTIFY,
    DEFAULT_ALERT_RADIUS,
    DEFAULT_SCAN_INTERVAL,
    DOMAIN,
    EVENT_ENTRY,
    EVENT_EXIT,
    MAX_SENSOR_AIRCRAFT,
)
from .feed import classify, haversine_nm, home_fix, pull_feeder, pull_public

_LOGGER = logging.getLogger(__name__)


class AdsbCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        opts = {**entry.data, **entry.options}
        interval = int(opts.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL))
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=max(2, interval)),
        )
        self.entry = entry
        self._primed = False
        self._seen: dict[str, set[str]] = {}

    def _opts(self) -> dict[str, Any]:
        return {**self.entry.data, **self.entry.options}

    def _home(self) -> tuple[float, float]:
        opts = self._opts()
        if opts.get(CONF_LATITUDE) is not None and opts.get(CONF_LONGITUDE) is not None:
            return float(opts[CONF_LATITUDE]), float(opts[CONF_LONGITUDE])
        return home_fix(self.hass)

    async def _async_update_data(self) -> dict[str, Any]:
        opts = self._opts()
        lat, lon = self._home()
        radius = int(opts.get(CONF_ALERT_RADIUS, DEFAULT_ALERT_RADIUS))
        feeder = (opts.get(CONF_FEEDER_URL) or "").strip()
        try:
            if feeder:
                feed = await pull_feeder(self.hass, feeder)
            else:
                feed = await pull_public(self.hass, lat, lon, max(radius * 3, 80))
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
            ac["dst"] = round(float(d), 2)
            if d < nearest_d:
                nearest_d = d
                nearest = ac
            if d > radius:
                continue
            for kind in classify(ac):
                alerts[kind].append(ac)

        if self._primed:
            await self._notify_changes(alerts)
        else:
            self._seen = {kind: {p["hex"] for p in planes} for kind, planes in alerts.items()}
            self._primed = True

        aircraft = sorted(feed["ac"], key=lambda a: a.get("dst") or 9e9)[:MAX_SENSOR_AIRCRAFT]
        return {
            "lat": lat,
            "lon": lon,
            "radius": radius,
            "count": len(feed["ac"]),
            "airborne": airborne,
            "source": feed.get("source"),
            "nearest": nearest,
            "alerts": alerts,
            "ac": aircraft,
        }

    async def _notify_changes(self, alerts: dict[str, list[dict[str, Any]]]) -> None:
        if self._opts().get(CONF_NOTIFY, True) is False:
            self._seen = {kind: {p["hex"] for p in planes} for kind, planes in alerts.items()}
            return
        for kind, planes in alerts.items():
            now = {p["hex"] for p in planes}
            prev = self._seen.get(kind, set())
            entered = now - prev
            exited = prev - now
            by_hex = {p["hex"]: p for p in planes}
            for hex_id in entered:
                ac = by_hex[hex_id]
                label = ac.get("flight") or ac.get("r") or hex_id
                typ = ac.get("t") or "?"
                dst = ac.get("dst")
                message = f"{label} ({typ}) — {kind} — {dst} NM from home"
                self.hass.bus.async_fire(
                    EVENT_ENTRY,
                    {"kind": kind, "hex": hex_id, "callsign": label, "type": typ, "distance_nm": dst, "aircraft": ac},
                )
                await self.hass.services.async_call(
                    "persistent_notification",
                    "create",
                    {
                        "title": f"ADS-B: {kind}",
                        "message": message,
                        "notification_id": f"adsb_globe_{kind}_{hex_id}",
                    },
                    blocking=False,
                )
            for hex_id in exited:
                self.hass.bus.async_fire(EVENT_EXIT, {"kind": kind, "hex": hex_id})
                await self.hass.services.async_call(
                    "persistent_notification",
                    "dismiss",
                    {"notification_id": f"adsb_globe_{kind}_{hex_id}"},
                    blocking=False,
                )
            self._seen[kind] = now
