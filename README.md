# ADS-B Globe

Live aircraft map for Home Assistant. Install as a **HACS Dashboard** card — it shows up in **Add card** with no YAML.

## Install

1. HACS → **⋮** → **Custom repositories**
2. URL: `https://github.com/OnChainPunk/ha-adsb-globe`
3. Type: **Dashboard**
4. Download **ADS-B Globe**
5. Restart Home Assistant
6. Hard-refresh the browser (**Ctrl+Shift+R**)
7. Edit dashboard → **Add card** → **ADS-B Globe**

If you previously installed this as an Integration, remove it from HACS, then install it again as **Dashboard**.

Updating from an older version: HACS → ADS-B Globe → **Redownload** → restart → hard-refresh.

## Optional sensors

The **Integration** (same repo, HACS type Integration) adds binary sensors such as Chinook / military / police in your alert radius, for automations. The map card does not need them.
