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
- Click empty map to close the panel and trail
- Gear → **Details panel** size 1–5 (compact to large)
- Gear → alert rules: all military, all helicopters, Chinook / Apache / Black Hawk / fighter / police / emergency, or a specific **type** (B38M, 737 MAX 8, PC-24) or **registration**
- Each rule has its own radius, show/hide ring, **title**, **message**, HA notification, optional `notify.mobile_app_…` service, and optional TTS (media player)
- Nearby military & helicopters in view can be tapped to add a watch rule
- `sensor.ads_b_in_area` with the aircraft list
- Binary sensors: military, helicopter, Chinook, Apache, Black Hawk, police, fighter, emergency squawk
- Persistent notifications + events `adsb_globe_entry` / `adsb_globe_exit` for automations

Optional local feeder: `http://<tar1090-host>/tar1090/data/aircraft.json`

Aircraft silhouettes are from [tar1090](https://github.com/wiedehopf/tar1090) (GPL-3.0), the same family ADS-B Exchange uses.

Not affiliated with ADS-B Exchange.

