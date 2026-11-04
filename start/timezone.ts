/*
|--------------------------------------------------------------------------
| Household time zone
|--------------------------------------------------------------------------
|
| The process runs in UTC, but every date of the household (a meal, a due
| date, a debit day) is a local calendar day. Luxon parses `date` columns
| in this zone, so they compare correctly with `today()`.
|
*/

import { Settings } from 'luxon'
import { HOME_ZONE } from '#support/dates'

Settings.defaultZone = HOME_ZONE
