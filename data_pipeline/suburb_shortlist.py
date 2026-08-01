"""
MVP suburb scope for Suburban Insight.

The proposal specifies "Melbourne suburbs" but does not define the exact
inclusion criteria (see docs/requirements.md §20, item 3). No ABS
correspondence file mapping every VIC suburb to "Greater Melbourne" has been
sourced yet, so this is a hand-picked, real-world set of well-known Greater
Melbourne suburbs spanning inner/middle/outer areas, used to keep the MVP a
manageable size. Replace/extend this list once the actual scope is confirmed.

sal_code is the bare 5-digit ABS Statistical Area Level (SAL) code, used to
look up rows in both the Census CSVs (as "SAL" + code) and the ABS boundary
shapefile (as the bare code).
"""

MELBOURNE_SUBURBS = [
    {"sal_code": "20569", "name": "Clayton"},
    {"sal_code": "20314", "name": "Box Hill"},
    {"sal_code": "21013", "name": "Glen Waverley"},
    {"sal_code": "22328", "name": "Springvale"},
    {"sal_code": "21640", "name": "Melbourne"},
    {"sal_code": "22314", "name": "South Yarra"},
    {"sal_code": "20935", "name": "Footscray"},
    {"sal_code": "21971", "name": "Northcote"},
    {"sal_code": "20771", "name": "Doncaster"},
    {"sal_code": "20707", "name": "Dandenong"},
    {"sal_code": "20947", "name": "Frankston"},
    {"sal_code": "22750", "name": "Werribee"},
    {"sal_code": "20885", "name": "Essendon"},
    {"sal_code": "20596", "name": "Coburg"},
    {"sal_code": "20521", "name": "Caulfield"},
    {"sal_code": "21816", "name": "Mount Waverley"},
    {"sal_code": "20528", "name": "Chadstone"},
    {"sal_code": "20495", "name": "Carlton"},
    {"sal_code": "20924", "name": "Fitzroy"},
    {"sal_code": "22170", "name": "Richmond"},
    {"sal_code": "22343", "name": "St Kilda"},
    {"sal_code": "20361", "name": "Brunswick"},
    {"sal_code": "22121", "name": "Preston"},
    {"sal_code": "21152", "name": "Hawthorn"},
    {"sal_code": "20453", "name": "Camberwell"},
    {"sal_code": "22174", "name": "Ringwood"},
    {"sal_code": "22395", "name": "Sunshine"},
    {"sal_code": "21586", "name": "Malvern"},
    {"sal_code": "20539", "name": "Cheltenham"},
    {"sal_code": "20337", "name": "Brighton"},
]
