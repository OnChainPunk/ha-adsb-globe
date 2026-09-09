# ADS-B Globe for Home Assistant

Live tar1090 / ADS-B Exchange-style aircraft map as a **Lovelace card**, plus sensors you can automate on.

Built for **Home Assistant OS** (including a Proxmox KVM VM). No extra containers required.

- Map loads **whatever the current zoom/view covers** (up to 250 NM, the public API limit)
- Refreshes every **1 second** — same interval as tar1090 and the ADS-B Exchange globe
- Home pin, range rings, amber alert ring
- Alerts for military, helicopters, Chinooks, Apaches, Black Hawks, police, fighters, emergency squawks
- Selected-aircraft trail only
- Dark / light / streets / OSM / satellite / terrain maps
- Uses `zone.home` from Home Assistant unless you override coordinates

Public traffic: [adsb.lol](https://adsb.lol) / [adsb.fi](https://opendata.adsb.fi). Optional local dump1090 / readsb / tar1090 feeder.

---

## “Custom element doesn’t exist: adsb-globe-card”

The YAML is fine. Home Assistant never loaded the card JavaScript. Do **all three**:

### 1. Add the integration (required)

**Settings → Devices & services → Add integration → ADS-B Globe**

HACS only copies files. Until this step, the card is not registered.

### 2. Add the Lovelace resource

**Settings → Dashboards → ⋮ (top right) → Resources → Add resource**

| Field | Value |
| --- | --- |
| URL | `/local/adsb_globe/adsb-globe-card.js?v=1.0.1` |
| Type | **JavaScript module** |

If that 404s, use `/adsb_globe/adsb-globe-card.js?v=1.0.1` instead.

### 3. Restart, then hard-refresh

1. **Developer tools → Restart**
2. In the browser: **Ctrl+Shift+R** (Cmd+Shift+R on Mac)

Then add the card again. The red error should be gone.

**HACS Dashboard fallback** (if the resource still 404s): HACS → ⋮ → Custom repositories → same GitHub URL → type **Dashboard** → Download. That installs `/hacsfiles/ha-adsb-globe/adsb-globe-card.js` and registers it automatically.

---

## Install on Proxmox Home Assistant OS

You already have HA running in a Proxmox VM — install this **inside that VM**, not as another LXC.

### A. HACS (recommended)

1. In Home Assistant: **HACS → Integrations → ⋮ (three dots) → Custom repositories**
2. Repository: `https://github.com/OnChainPunk/ha-adsb-globe`
3. Type: **Integration**
4. **Add** → find **ADS-B Globe** → **Download**
5. **Developer tools → Restart** Home Assistant
6. **Settings → Devices & services → Add integration → ADS-B Globe**
7. Leave *Local feeder URL* blank unless you run a radio (see below)
8. Add the Lovelace resource (table above), restart, hard-refresh

### B. Manual (Samba / SSH / File editor)

1. Copy the folder `custom_components/adsb_globe` to  
   `/config/custom_components/adsb_globe`  
   on the HA VM.
2. Restart Home Assistant
3. **Settings → Devices & services → Add integration → ADS-B Globe**
4. Add the Lovelace resource as above

---

## Add the card

Edit dashboard → **Add card → Manual**:

```yaml
type: custom:adsb-globe-card
title: Airspace
map: dark
show_labels: true
show_trails: true
show_range_rings: true
show_ground: false
alert:
  enabled: true
  radius_nm: 15
  on:
    - military
    - helicopter
    - chinook
    - apache
    - blackhawk
    - police
    - fighter
    - emergency
```

Optional overrides (otherwise `zone.home` is used):

```yaml
latitude: 51.4700
longitude: -0.4543
home_name: Heathrow
```

---

## Local ADS-B radio (optional)

If you already run **readsb / tar1090 / ultrafeeder** as another Proxmox LXC or VM:

1. Note its IP, e.g. `192.168.1.20`
2. Confirm you can open `http://192.168.1.20/data/aircraft.json` (or `/tar1090/data/aircraft.json`)
3. In the integration options, set  
   **Local feeder URL** = `http://192.168.1.20/tar1090/data/aircraft.json`
4. HA VM must be able to reach that IP (same LAN / vmbr)

---

## Entities for automations

| Entity | When it turns on |
| --- | --- |
| `binary_sensor.ads_b_military_in_zone` | Military flagged aircraft inside the alert radius |
| `binary_sensor.ads_b_helicopter_in_zone` | Any helicopter |
| `binary_sensor.ads_b_chinook_in_zone` | CH-47 |
| `binary_sensor.ads_b_apache_in_zone` | AH-64 |
| `binary_sensor.ads_b_black_hawk_in_zone` | UH-60 |
| `binary_sensor.ads_b_police_aircraft_in_zone` | Police callsigns |
| `binary_sensor.ads_b_fighter_in_zone` | F-16 / F-35 / Typhoon / … |
| `binary_sensor.ads_b_emergency_squawk_in_zone` | 7500 / 7600 / 7700 |
| `sensor.ads_b_aircraft_in_range` | Count |
| `sensor.ads_b_nearest` | Distance NM + callsign attributes |

Example:

```yaml
automation:
  - alias: Chinook nearby
    trigger:
      - platform: state
        entity_id: binary_sensor.ads_b_chinook_in_zone
        to: "on"
    action:
      - service: notify.mobile_app_your_phone
        data:
          title: Chinook
          message: "{{ state_attr('binary_sensor.ads_b_chinook_in_zone', 'callsigns') }}"
```

---

## Toolbar

Labels · selected trail · ground traffic · military-only · pause · map styles.

Click an aircraft for the info panel. Trails are drawn only for the selected plane.

---

## Notes

- Not affiliated with ADS-B Exchange. Silhouettes are simplified tar1090-style icons.
- Public API coverage depends on volunteer feeders; a local radio is better for your own sky.
- Polling: **card 1 s** (view), **sensors 10 s** (entities).
