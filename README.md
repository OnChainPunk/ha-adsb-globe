# ADS-B Globe

Home Assistant integration with a Lovelace map card. Same install path as [Flightradar24](https://github.com/AlexandrErohin/home-assistant-flightradar24): HACS **Integration**, restart, add the integration, then the card is in **Add card**. No YAML. No manual resources.

## Install

1. HACS → **Integrations** → ⋮ → **Custom repositories**
2. URL `https://github.com/OnChainPunk/ha-adsb-globe`
3. Type **Integration**
4. Download **ADS-B Globe**
5. Restart Home Assistant
6. **Settings → Devices & services → Add integration → ADS-B Globe**
7. Keep the default lat/lon (your HA home) and radius
8. Edit dashboard → **Add card** → search **ADS-B Globe**

## What you get

- Lovelace card: live map, selectable basemaps, tar1090-style icons, selected-aircraft trail
- `sensor.ads_b_in_area` with the aircraft list (the card uses this)
- Binary sensors: military, helicopter, Chinook, Apache, Black Hawk, police, fighter, emergency squawk
- Notifications when those types enter your radius (HA persistent notifications)
- Events `adsb_globe_entry` / `adsb_globe_exit` for automations

Optional local feeder: `http://<tar1090-host>/tar1090/data/aircraft.json`

Not affiliated with ADS-B Exchange.
