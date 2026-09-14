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

After an update: HACS → ADS-B Globe → **Redownload**, restart HA, then **Ctrl+Shift+R** on the dashboard so the browser picks up the new card.

## What you get

- Lovelace card: live map, selectable basemaps, ADS-B Exchange / tar1090 silhouettes (airliner, heli, Chinook, Apache, fighter, …)
- Hover a plane for the compact popup (callsign, hex, reg, type, alt, speed, source, RSSI)
- Click a plane for the full scrollable details panel (photo, spatial, signal, FMS, wind, speed, altitude, direction, accuracy) and its **full trail**
- Click empty map to close the panel, trail and settings
- Gear → details box: width, height, left, top sliders and corner presets
- Gear → **data sources**: enable/disable adsb.lol and opendata.adsb.fi, or paste a tar1090 `aircraft.json` URL. Each stream has its own **update rate**. Public APIs cap one request at 250 NM; the card loads overlapping tiles and **keeps aircraft at their real positions when you pan** (same idea as ADS-B Exchange / tar1090 globe tiles)
- Gear → **quick select**: editable chips (label, match, type/reg, radius, title, message) that add a watch
- Gear → alert rules: military / helicopters / Chinook / Apache / Black Hawk / fighter / police / emergency, or a specific **type** or **registration**
- Each rule: radius, ring, title, message, HA notification, **notify device dropdown** (or custom), **speak dropdown** (or custom media player)
- `sensor.ads_b_in_area` with the aircraft list
- Binary sensors: military, helicopter, Chinook, Apache, Black Hawk, police, fighter, emergency squawk
- Persistent notifications + events `adsb_globe_entry` / `adsb_globe_exit` for automations

Optional local feeder: `http://<tar1090-host>/tar1090/data/aircraft.json`

Aircraft silhouettes are from [tar1090](https://github.com/wiedehopf/tar1090) (GPL-3.0), the same family ADS-B Exchange uses.

Not affiliated with ADS-B Exchange.
