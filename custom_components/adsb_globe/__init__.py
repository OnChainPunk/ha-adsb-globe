from __future__ import annotations

import logging
import shutil
from pathlib import Path

import voluptuous as vol
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN, PLATFORMS, URL_BASE
from .coordinator import AdsbCoordinator
from .view import AdsbFeedView

_LOGGER = logging.getLogger(__name__)
_FRONTEND_REGISTERED = False
CARD_VERSION = "1.0.1"
RESOURCE_URL = f"/local/adsb_globe/adsb-globe-card.js?v={CARD_VERSION}"

CONFIG_SCHEMA = vol.Schema({DOMAIN: vol.Schema({}, extra=vol.ALLOW_EXTRA)}, extra=vol.ALLOW_EXTRA)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Load frontend even with only `adsb_globe:` in configuration.yaml."""
    await _register_frontend(hass)
    return True


async def _register_frontend(hass: HomeAssistant) -> None:
    global _FRONTEND_REGISTERED
    if _FRONTEND_REGISTERED:
        return
    www = Path(__file__).parent / "www"

    try:
        await hass.http.async_register_static_paths(
            [StaticPathConfig(URL_BASE, str(www), False)]
        )
    except Exception as err:  # already registered on reload
        _LOGGER.debug("static path: %s", err)

    dest = Path(hass.config.path("www/adsb_globe"))

    def _copy_www() -> None:
        dest.mkdir(parents=True, exist_ok=True)
        for name in ("adsb-globe-card.js", "leaflet.js", "leaflet.css"):
            src = www / name
            if src.exists():
                shutil.copyfile(src, dest / name)

    await hass.async_add_executor_job(_copy_www)

    try:
        hass.http.register_view(AdsbFeedView(hass))
    except Exception as err:
        _LOGGER.debug("view: %s", err)

    for url in (
        f"{URL_BASE}/adsb-globe-card.js?v={CARD_VERSION}",
        RESOURCE_URL,
    ):
        try:
            add_extra_js_url(hass, url)
        except Exception as err:
            _LOGGER.debug("extra js %s: %s", url, err)

    await _ensure_lovelace_resource(hass, RESOURCE_URL)
    _FRONTEND_REGISTERED = True
    _LOGGER.info("ADS-B Globe card at %s and %s", URL_BASE, RESOURCE_URL)


async def _ensure_lovelace_resource(hass: HomeAssistant, url: str) -> None:
    """Make the Lovelace editor actually find custom:adsb-globe-card."""

    @callback
    def _register(_event=None) -> None:
        hass.async_create_task(_async_add_resource(hass, url))

    if "lovelace" in hass.config.components:
        await _async_add_resource(hass, url)
    else:
        hass.bus.async_listen_once("lovelace_updated", _register)
        hass.bus.async_listen_once("homeassistant_started", _register)


async def _async_add_resource(hass: HomeAssistant, url: str) -> None:
    try:
        ll = hass.data.get("lovelace")
        if ll is None:
            return
        resources = getattr(ll, "resources", None)
        if resources is None or not hasattr(resources, "async_items"):
            _LOGGER.info(
                "Lovelace is in YAML mode — add this resource manually: %s (JavaScript module)",
                url,
            )
            return
        if hasattr(resources, "async_load"):
            await resources.async_load()
        items = list(resources.async_items())
        if any(str(item.get("url") or "").split("?")[0] == url.split("?")[0] for item in items):
            return
        await resources.async_create_item({"res_type": "module", "url": url})
        _LOGGER.info("Registered Lovelace resource %s", url)
    except Exception as err:
        _LOGGER.warning("Could not auto-register Lovelace resource: %s", err)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    await _register_frontend(hass)
    coordinator = AdsbCoordinator(hass, entry)
    await coordinator.async_config_entry_first_refresh()
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = coordinator
    entry.async_on_unload(entry.add_update_listener(_reload))
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def _reload(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unload = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    return unload
