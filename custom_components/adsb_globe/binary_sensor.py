from __future__ import annotations

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import AdsbCoordinator

KINDS = (
    ("military", "Military in zone", "mdi:shield-airplane", None),
    ("helicopter", "Helicopter in zone", "mdi:helicopter", None),
    ("chinook", "Chinook in zone", "mdi:helicopter", None),
    ("apache", "Apache in zone", "mdi:helicopter", None),
    ("blackhawk", "Black Hawk in zone", "mdi:helicopter", None),
    ("police", "Police aircraft in zone", "mdi:police-badge", None),
    ("fighter", "Fighter in zone", "mdi:airplane", None),
    ("emergency", "Emergency squawk in zone", "mdi:alert", BinarySensorDeviceClass.SAFETY),
)


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coord: AdsbCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([AdsbAlertBinary(coord, entry, *k) for k in KINDS])


class AdsbAlertBinary(CoordinatorEntity[AdsbCoordinator], BinarySensorEntity):
    def __init__(
        self,
        coordinator: AdsbCoordinator,
        entry: ConfigEntry,
        key: str,
        name: str,
        icon: str,
        device_class,
    ) -> None:
        super().__init__(coordinator)
        self._key = key
        self._attr_name = f"ADS-B {name}"
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        self._attr_icon = icon
        self._attr_device_class = device_class

    @property
    def is_on(self) -> bool:
        alerts = (self.coordinator.data or {}).get("alerts") or {}
        return bool(alerts.get(self._key))

    @property
    def extra_state_attributes(self):
        hits = ((self.coordinator.data or {}).get("alerts") or {}).get(self._key) or []
        return {
            "count": len(hits),
            "callsigns": [h.get("flight") or h.get("hex") for h in hits[:12]],
        }
