DOMAIN = "adsb_globe"
PLATFORMS = ["sensor", "binary_sensor"]

CONF_FEEDER_URL = "feeder_url"
CONF_ALERT_RADIUS = "alert_radius_nm"
CONF_NAME = "name"

DEFAULT_NAME = "ADS-B Globe"
DEFAULT_ALERT_RADIUS = 15
DEFAULT_SCAN_INTERVAL = 10

URL_BASE = "/adsb_globe"

PROVIDERS = (
    "https://api.adsb.lol/v2/lat/{lat}/lon/{lon}/dist/{dist}",
    "https://opendata.adsb.fi/api/v3/lat/{lat}/lon/{lon}/dist/{dist}",
)

MAX_DIST_NM = 250
