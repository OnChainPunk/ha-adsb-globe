from __future__ import annotations

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult

from .const import (
    CONF_ALERT_RADIUS,
    CONF_FEEDER_URL,
    CONF_NAME,
    DEFAULT_ALERT_RADIUS,
    DEFAULT_NAME,
    DOMAIN,
)


def _schema(defaults: dict | None = None) -> vol.Schema:
    d = defaults or {}
    return vol.Schema(
        {
            vol.Optional(CONF_NAME, default=d.get(CONF_NAME, DEFAULT_NAME)): str,
            vol.Optional(CONF_FEEDER_URL, default=d.get(CONF_FEEDER_URL, "")): str,
            vol.Optional(
                CONF_ALERT_RADIUS,
                default=d.get(CONF_ALERT_RADIUS, DEFAULT_ALERT_RADIUS),
            ): vol.All(vol.Coerce(int), vol.Range(min=2, max=80)),
        }
    )


class AdsbGlobeConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict | None = None) -> FlowResult:
        if self._async_current_entries():
            return self.async_abort(reason="already_configured")
        if user_input is not None:
            user_input[CONF_FEEDER_URL] = (user_input.get(CONF_FEEDER_URL) or "").strip()
            return self.async_create_entry(
                title=user_input.get(CONF_NAME) or DEFAULT_NAME,
                data=user_input,
            )
        return self.async_show_form(step_id="user", data_schema=_schema())

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return AdsbGlobeOptionsFlow(config_entry)


class AdsbGlobeOptionsFlow(config_entries.OptionsFlow):
    def __init__(self, entry: config_entries.ConfigEntry) -> None:
        self.entry = entry

    async def async_step_init(self, user_input: dict | None = None) -> FlowResult:
        if user_input is not None:
            user_input[CONF_FEEDER_URL] = (user_input.get(CONF_FEEDER_URL) or "").strip()
            return self.async_create_entry(title="", data=user_input)
        merged = {**self.entry.data, **self.entry.options}
        return self.async_show_form(step_id="init", data_schema=_schema(merged))
