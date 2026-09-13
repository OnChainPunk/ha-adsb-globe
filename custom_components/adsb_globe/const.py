from pathlib import Path
import json

DOMAIN = "adsb_globe"
PLATFORMS = ["sensor", "binary_sensor"]
DEFAULT_NAME = "ADS-B Globe"

with open(Path(__file__).parent / "manifest.json", encoding="utf-8") as _manifest:
    INTEGRATION_VERSION = json.load(_manifest).get("version", "0.0.0")

URL_BASE = f"/{DOMAIN}"
JSMODULES = [
    {
        "name": "ADS-B Globe Card",
        "filename": "adsb-globe-card.js",
        "version": INTEGRATION_VERSION,
    }
]

CONF_FEEDER_URL = "feeder_url"
CONF_ALERT_RADIUS = "alert_radius_nm"
CONF_NAME = "name"
CONF_NOTIFY = "notify"

DEFAULT_ALERT_RADIUS = 15
DEFAULT_SCAN_INTERVAL = 2

EVENT_ENTRY = f"{DOMAIN}_entry"
EVENT_EXIT = f"{DOMAIN}_exit"

PROVIDERS = (
    "https://api.adsb.lol/v2/lat/{lat}/lon/{lon}/dist/{dist}",
    "https://opendata.adsb.fi/api/v3/lat/{lat}/lon/{lon}/dist/{dist}",
)

MAX_DIST_NM = 250
MAX_SENSOR_AIRCRAFT = 180
