from __future__ import annotations

from datetime import timedelta
import json
import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_LATITUDE, CONF_LONGITUDE, CONF_SCAN_INTERVAL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import (
    CONF_ALERT_RADIUS,
    CONF_ALERT_RULES,
    CONF_FEEDER_URL,
    CONF_NOTIFY,
    CONF_PANEL_SIZE,
    DEFAULT_ALERT_RADIUS,
    DEFAULT_ALERT_RULES,
    DEFAULT_PANEL_SIZE,
    DEFAULT_SCAN_INTERVAL,
    DOMAIN,
    EVENT_ENTRY,
    EVENT_EXIT,
    MAX_SENSOR_AIRCRAFT,
)
from .feed import classify, format_alert, haversine_nm, home_fix, match_rule, pull_feeder, pull_public

_LOGGER = logging.getLogger(__name__)


def _rules(opts: dict[str, Any]) -> list[dict[str, Any]]:
    rules = opts.get(CONF_ALERT_RULES) or DEFAULT_ALERT_RULES
    if isinstance(rules, str):
        try:
            rules = json.loads(rules)
        except json.JSONDecodeError:
            rules = DEFAULT_ALERT_RULES
    if not isinstance(rules, list):
        return list(DEFAULT_ALERT_RULES)
    return rules


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
        rules = _rules(opts)
        feeder = (opts.get(CONF_FEEDER_URL) or "").strip()
        try:
            if feeder:
                feed = await pull_feeder(self.hass, feeder)
            else:
                max_r = max([radius] + [int(r.get("radius_nm") or radius) for r in rules] + [80])
                feed = await pull_public(self.hass, lat, lon, max_r)
        except Exception as err:
            raise UpdateFailed(str(err)) from err

        matched: dict[str, list[dict[str, Any]]] = {}
        kinds: dict[str, list[dict[str, Any]]] = {}
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
            if d <= radius:
                for kind in classify(ac):
                    kinds.setdefault(kind, []).append(ac)
            for rule in rules:
                rid = str(rule.get("id") or "")
                if not rid or not match_rule(ac, rule):
                    continue
                r = float(rule.get("radius_nm") or radius)
                if d <= r:
                    matched.setdefault(rid, []).append(ac)

        if self._primed:
            await self._notify_rules(rules, matched)
        else:
            self._seen = {rid: {p["hex"] for p in planes} for rid, planes in matched.items()}
            self._primed = True

        aircraft = sorted(feed["ac"], key=lambda a: a.get("dst") or 9e9)[:MAX_SENSOR_AIRCRAFT]
        return {
            "lat": lat,
            "lon": lon,
            "radius": radius,
            "panel_size": int(opts.get(CONF_PANEL_SIZE, DEFAULT_PANEL_SIZE)),
            "count": len(feed["ac"]),
            "airborne": airborne,
            "source": feed.get("source"),
            "nearest": nearest,
            "alerts": kinds,
            "rule_hits": {rid: [p["hex"] for p in planes] for rid, planes in matched.items()},
            "rules": rules,
            "ac": aircraft,
        }

    async def _notify_rules(self, rules: list[dict[str, Any]], matched: dict[str, list[dict[str, Any]]]) -> None:
        master = self._opts().get(CONF_NOTIFY, True) is not False
        for rule in rules:
            rid = str(rule.get("id") or "")
            planes = matched.get(rid, [])
            now = {p["hex"] for p in planes}
            prev = self._seen.get(rid, set())
            entered = now - prev
            exited = prev - now
            by_hex = {p["hex"]: p for p in planes}
            for hex_id in entered:
                ac = by_hex[hex_id]
                dst = float(ac.get("dst") or 0)
                message = format_alert(str(rule.get("message") or ""), ac, rule, dst)
                title = format_alert(str(rule.get("title") or "ADS-B {match}"), ac, rule, dst)
                self.hass.bus.async_fire(
                    EVENT_ENTRY,
                    {
                        "rule": rid,
                        "kind": rule.get("match"),
                        "hex": hex_id,
                        "title": title,
                        "message": message,
                        "aircraft": ac,
                    },
                )
                if master:
                    await self._do_actions(rule, rid, hex_id, title, message)
            for hex_id in exited:
                self.hass.bus.async_fire(EVENT_EXIT, {"rule": rid, "hex": hex_id})
                if master and rule.get("notify", True):
                    await self.hass.services.async_call(
                        "persistent_notification",
                        "dismiss",
                        {"notification_id": f"adsb_globe_{rid}_{hex_id}"},
                        blocking=False,
                    )
            self._seen[rid] = now

    async def _do_actions(self, rule: dict[str, Any], rid: str, hex_id: str, title: str, message: str) -> None:
        if rule.get("notify", True):
            await self.hass.services.async_call(
                "persistent_notification",
                "create",
                {
                    "title": title,
                    "message": message,
                    "notification_id": f"adsb_globe_{rid}_{hex_id}",
                },
                blocking=False,
            )
        svc = str(rule.get("notify_service") or "").strip()
        if svc:
            domain, name = _split_service(svc)
            if domain and name and self.hass.services.has_service(domain, name):
                try:
                    await self.hass.services.async_call(
                        domain, name, {"title": title, "message": message}, blocking=False
                    )
                except Exception as err:  # noqa: BLE001
                    _LOGGER.debug("notify %s.%s failed: %s", domain, name, err)
        if not rule.get("tts"):
            return
        media = str(rule.get("tts_media") or "").strip()
        if not media:
            return
        try:
            if self.hass.services.has_service("tts", "speak"):
                await self.hass.services.async_call(
                    "tts",
                    "speak",
                    {"media_player_entity_id": media, "message": message},
                    blocking=False,
                )
            elif self.hass.services.has_service("tts", "google_translate_say"):
                await self.hass.services.async_call(
                    "tts",
                    "google_translate_say",
                    {"entity_id": media, "message": message},
                    blocking=False,
                )
        except Exception as err:  # noqa: BLE001
            _LOGGER.debug("tts failed: %s", err)


def _split_service(svc: str) -> tuple[str, str]:
    raw = svc.strip().lstrip("/")
    if "." in raw:
        domain, name = raw.split(".", 1)
        return domain, name
    return "notify", raw
