# ADS-B Globe for Home Assistant

Live tar1090 / ADS-B Exchange-style aircraft map as a Lovelace card.

## Install so it appears under custom cards

HACS only auto-registers **Dashboard** plugins in the Add card picker. An Integration install will not.

1. **HACS → ⋮ → Custom repositories**
2. Repository: `https://github.com/OnChainPunk/ha-adsb-globe`
3. Type: **Dashboard** (not Integration)
4. **Add** → find **ADS-B Globe** → **Download**
5. Restart Home Assistant
6. Hard-refresh the browser (**Ctrl+Shift+R**)
7. Edit dashboard → **Add card** → **ADS-B Globe** should be in the list

If you already added this repo as an Integration, remove that custom repository (or leave it for sensors) and add the **same URL again as Dashboard**. The Dashboard type is what puts the card in the picker and loads the JavaScript.

---

## Still seeing “Custom element doesn’t exist”?

The JS never loaded. After a Dashboard install, HACS should have created this resource automatically:

| Field | Value |
| --- | --- |
| URL | `/hacsfiles/ha-adsb-globe/adsb-globe-card.js` |
| Type | JavaScript module |

Check **Settings → Dashboards → Resources**. If it’s missing, add it, restart, hard-refresh.

---

## Optional: sensors / alerts as HA entities

Same repo, HACS type **Integration**, then **Settings → Devices & services → Add integration → ADS-B Globe**.

That gives `binary_sensor.ads_b_chinook_in_zone`, military, police, emergency squawk, etc.

The card itself does **not** need the integration. Dashboard install is enough to see planes.

---

## Card YAML (or just pick it in the UI)

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
  on: [military, helicopter, chinook, apache, blackhawk, police, fighter, emergency]
```

Home is `zone.home` unless you set `latitude` / `longitude`.

---

## Local ADS-B radio

If tar1090/readsb runs in another Proxmox LXC, set the integration feeder URL to  
`http://<feeder-ip>/tar1090/data/aircraft.json`

---

Map loads the current view, polls every 1 second (same as tar1090). Not affiliated with ADS-B Exchange.
