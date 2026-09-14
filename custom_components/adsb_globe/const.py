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
CONF_ALERT_RULES = "alert_rules"
CONF_PANEL_SIZE = "panel_size"
CONF_PANEL = "panel"
CONF_SOURCES = "sources"
CONF_QUICK_TYPES = "quick_types"

DEFAULT_ALERT_RADIUS = 15
DEFAULT_SCAN_INTERVAL = 2
DEFAULT_PANEL_SIZE = 2
DEFAULT_PANEL = {"w": 208, "h": 38, "left": 1.5, "top": 1.5}

DEFAULT_ALERT_RULES = [
    {
        "id": "mil",
        "enabled": True,
        "match": "military",
        "value": "",
        "radius_nm": 15,
        "show_ring": True,
        "notify": True,
        "notify_service": "",
        "tts": False,
        "tts_media": "",
        "title": "ADS-B {match}",
        "message": "{callsign} ({type}) military {dist} NM",
    },
    {
        "id": "heli",
        "enabled": True,
        "match": "helicopter",
        "value": "",
        "radius_nm": 15,
        "show_ring": True,
        "notify": True,
        "notify_service": "",
        "tts": False,
        "tts_media": "",
        "title": "ADS-B {match}",
        "message": "{callsign} ({type}) helicopter {dist} NM",
    },
]

DEFAULT_QUICK_TYPES = [
    {"id": "q_mil", "label": "All military", "match": "military", "value": "", "radius_nm": 15, "title": "ADS-B military", "message": "{callsign} ({type}) military {dist} NM"},
    {"id": "q_heli", "label": "All helicopters", "match": "helicopter", "value": "", "radius_nm": 15, "title": "ADS-B helicopter", "message": "{callsign} ({type}) helicopter {dist} NM"},
    {"id": "q_chinook", "label": "Chinook", "match": "chinook", "value": "", "radius_nm": 20, "title": "ADS-B chinook", "message": "{callsign} ({type}) Chinook {dist} NM"},
    {"id": "q_apache", "label": "Apache", "match": "apache", "value": "", "radius_nm": 20, "title": "ADS-B apache", "message": "{callsign} ({type}) Apache {dist} NM"},
]

EVENT_ENTRY = f"{DOMAIN}_entry"
EVENT_EXIT = f"{DOMAIN}_exit"

PROVIDERS = (
    "https://api.adsb.lol/v2/lat/{lat}/lon/{lon}/dist/{dist}",
    "https://opendata.adsb.fi/api/v3/lat/{lat}/lon/{lon}/dist/{dist}",
)

DEFAULT_SOURCES = [
    {"id": "adsblol", "label": "adsb.lol", "url": PROVIDERS[0], "enabled": True, "interval": 1},
    {"id": "adsbfi", "label": "opendata.adsb.fi", "url": PROVIDERS[1], "enabled": True, "interval": 1},
]

MAX_DIST_NM = 250
MAX_SENSOR_AIRCRAFT = 180
MAX_VIEW_TILES = 9
