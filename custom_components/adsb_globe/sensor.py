from __future__ import annotations

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import CONF_NOTIFY, CONF_PANEL_SIZE, DEFAULT_PANEL_SIZE, DOMAIN
from .coordinator import AdsbCoordinator


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coord: AdsbCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(
        [
            AdsbInAreaSensor(coord, entry),
            AdsbCountSensor(coord, entry, "airborne", "Airborne", "mdi:airplane-takeoff"),
            AdsbNearestSensor(coord, entry),
        ]
    )


class AdsbInAreaSensor(CoordinatorEntity[AdsbCoordinator], SensorEntity):
    _attr_name = "ADS-B in area"
    _attr_icon = "mdi:airplane"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "aircraft"

    def __init__(self, coordinator: AdsbCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"{entry.entry_id}_in_area"

    @property
    def native_value(self):
        return (self.coordinator.data or {}).get("count")

    @property
    def extra_state_attributes(self):
        data = self.coordinator.data or {}
        opts = {**self.coordinator.entry.data, **self.coordinator.entry.options}
        return {
            "latitude": data.get("lat"),
            "longitude": data.get("lon"),
            "radius_nm": data.get("radius"),
            "notify": opts.get(CONF_NOTIFY, True),
            "panel_size": opts.get(CONF_PANEL_SIZE, data.get("panel_size", DEFAULT_PANEL_SIZE)),
            "source": data.get("source"),
            "alert_rules": data.get("rules") or [],
            "aircraft": data.get("ac") or [],
        }


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
