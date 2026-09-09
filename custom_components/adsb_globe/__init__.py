from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN, PLATFORMS, URL_BASE
from .coordinator import AdsbCoordinator
from .view import AdsbFeedView

_LOGGER = logging.getLogger(__name__)
_FRONTEND_REGISTERED = False


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    await _register_frontend(hass)
    return True


async def _register_frontend(hass: HomeAssistant) -> None:
    global _FRONTEND_REGISTERED
    if _FRONTEND_REGISTERED:
        return
    www = Path(__file__).parent / "www"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(URL_BASE, str(www), False)]
    )
    add_extra_js_url(hass, f"{URL_BASE}/adsb-globe-card.js")
    hass.http.register_view(AdsbFeedView(hass))
    _FRONTEND_REGISTERED = True
    _LOGGER.info("ADS-B Globe card registered at %s/adsb-globe-card.js", URL_BASE)


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
