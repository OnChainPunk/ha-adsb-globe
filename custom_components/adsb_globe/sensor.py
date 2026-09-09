from __future__ import annotations

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import AdsbCoordinator


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coord: AdsbCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(
        [
            AdsbCountSensor(coord, entry, "count", "Aircraft in range", "mdi:airplane"),
            AdsbCountSensor(coord, entry, "airborne", "Airborne", "mdi:airplane-takeoff"),
            AdsbNearestSensor(coord, entry),
        ]
    )


class AdsbCountSensor(CoordinatorEntity[AdsbCoordinator], SensorEntity):
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: AdsbCoordinator, entry: ConfigEntry, key: str, name: str, icon: str) -> None:
        super().__init__(coordinator)
        self._key = key
        self._attr_name = f"ADS-B {name}"
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        self._attr_icon = icon
        self._attr_native_unit_of_measurement = "aircraft"

    @property
    def native_value(self):
        return (self.coordinator.data or {}).get(self._key)


class AdsbNearestSensor(CoordinatorEntity[AdsbCoordinator], SensorEntity):
    _attr_name = "ADS-B nearest"
    _attr_icon = "mdi:radar"
    _attr_native_unit_of_measurement = "NM"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_suggested_display_precision = 1

    def __init__(self, coordinator: AdsbCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"{entry.entry_id}_nearest"

    @property
    def native_value(self):
        n = (self.coordinator.data or {}).get("nearest")
        return None if not n else round(float(n.get("dst") or 0), 1)

    @property
    def extra_state_attributes(self):
        n = (self.coordinator.data or {}).get("nearest") or {}
        return {
            "callsign": n.get("flight") or n.get("hex"),
            "hex": n.get("hex"),
            "type": n.get("t"),
            "altitude": n.get("alt"),
            "registration": n.get("r"),
        }
