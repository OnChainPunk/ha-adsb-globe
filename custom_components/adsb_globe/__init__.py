from __future__ import annotations

from json import JSONDecodeError, loads
from logging import getLogger

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CoreState, HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import CONF_ALERT_RADIUS, CONF_ALERT_RULES, CONF_NOTIFY, CONF_PANEL_SIZE, DOMAIN, PLATFORMS
from .coordinator import AdsbCoordinator
from .frontend import JSModuleRegistration
from .view import AdsbAircraftView, AdsbPhotoView, AdsbTraceView

_LOGGER = getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the Lovelace card once, same pattern as Flightradar24."""

    async def _register_frontend(_event=None) -> None:
        await JSModuleRegistration(hass).async_register()
        await _async_register_services(hass)

    if hass.state == CoreState.running:
        await _register_frontend()
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _register_frontend)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    await JSModuleRegistration(hass).async_register()
    await _async_register_services(hass)
    if not hass.data.get(f"{DOMAIN}_view"):
        hass.http.register_view(AdsbAircraftView())
        hass.http.register_view(AdsbTraceView())
        hass.http.register_view(AdsbPhotoView())
        hass.data[f"{DOMAIN}_view"] = True
    coordinator = AdsbCoordinator(hass, entry)
    await coordinator.async_config_entry_first_refresh()
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = coordinator
    entry.async_on_unload(entry.add_update_listener(_options_updated))
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def _options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    coord = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    if coord:
        await coord.async_request_refresh()


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unload = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    return unload


async def _async_register_services(hass: HomeAssistant) -> None:
    if hass.services.has_service(DOMAIN, "set_options"):
        return

    async def _set_options(call) -> None:
        entries = hass.config_entries.async_entries(DOMAIN)
        if not entries:
            return
        entry = entries[0]
        opts = {**entry.options}
        if "radius_nm" in call.data:
            opts[CONF_ALERT_RADIUS] = int(call.data["radius_nm"])
        if "notify" in call.data:
            opts[CONF_NOTIFY] = bool(call.data["notify"])
        if "panel_size" in call.data:
            try:
                opts[CONF_PANEL_SIZE] = max(1, min(5, int(call.data["panel_size"])))
            except (TypeError, ValueError):
                pass
        if "rules" in call.data:
            rules = call.data["rules"]
            if isinstance(rules, str):
                try:
                    rules = loads(rules)
                except JSONDecodeError:
                    rules = None
            if isinstance(rules, list):
                opts[CONF_ALERT_RULES] = rules
        hass.config_entries.async_update_entry(entry, options=opts)
        coord = hass.data.get(DOMAIN, {}).get(entry.entry_id)
        if coord:
            await coord.async_request_refresh()

    hass.services.async_register(DOMAIN, "set_options", _set_options)
