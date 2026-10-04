# Delta T CSV schema v0 (schema_version = 1)

One row per valid serial packet, nominally once per second. The Pi assigns UTC on receipt; ESP32 uptime is the device sampling clock. UTC requires the Pi's clock to be synchronized. Empty values mean unavailable, never zero. Sensor failures are retained with `sensor_ok=False` and an empty temperature.

| Column | Type / unit | v0 source / meaning |
|---|---|---|
| timestamp_utc | ISO 8601 UTC | Pi reception time |
| host_monotonic_ns | integer ns | Pi monotonic clock, comparable within session |
| session_id | UUID string | New UUID every logger run |
| schema_version | integer | 1 |
| device_id | string | esp32-01 |
| boot_id | hex string | New random ID on ESP32 reboot |
| seq | integer | Sample counter, starts at 0 each boot |
| uptime_ms | uint32 ms | ESP32 millis; wraps after about 49.7 days |
| sensor_ok | Boolean | Whether probe 1 returned a valid conversion |
| temp_probe_1_c | °C | DS18B20 on GPIO4; only implemented sensor |
| temp_inlet_c | °C | Proposed inlet probe; blank in v0 |
| temp_outlet_c | °C | Proposed outlet probe; blank in v0 |
| temp_ambient_c | °C | Proposed ambient probe; blank in v0 |
| flow_lpm | L/min | Proposed flow sensor; blank in v0 |
| fan_rpm | RPM | Proposed fan tachometer; blank in v0 |
| pump_rpm | RPM | Proposed pump tachometer; blank in v0 |
| power_w | W | Proposed power measurement; blank in v0 |
| cpu_util_pct | percent, 0–100 | Proposed live workload measurement; blank in v0 |
| temp_setpoint_c | °C | Controller temperature target; blank in v0 |
| fan_setpoint_pct | percent, 0–100 | Commanded fan duty; blank in v0 |
| pump_setpoint_pct | percent, 0–100 | Commanded pump duty; blank in v0 |
| workload_setpoint_pct | percent, 0–100 | Commanded workload; blank in v0 |
| control_mode | string enum | Proposed off/manual/reactive/predictive; blank in v0 |

The schema reserves eight node channels; unused channels remain blank. Match numbered channels to physical nodes before integration. Only the original DS18B20 is implemented in firmware v0. Additional columns are accepted by the logger when supplied, but do not imply that additional sensors or actuator controls are implemented. Log commanded set-points when issued and propagate the most recent value into later samples; measure actuator feedback separately. v0 has no actuator control.

Device JSON example:
```json
{"schema_version":1,"device_id":"esp32-01","boot_id":"0123abcd","seq":0,"uptime_ms":1000,"sensor_ok":true,"temp_probe_1_c":23.5}
```

Duplicate key: `(device_id, boot_id, seq)`. A sequence jump indicates a missing device record; a new boot ID indicates restart. A repeated temperature is a legitimate measurement and is not a duplicate record.

## Hybrid cooling extension

The CSV header has been extended; use a fresh output CSV rather than appending to an older header. Device packet `schema_version=1` is unchanged. The full canonical header is `logging/schema.py: FIELDS`.

| Added column | Unit / meaning |
|---|---|
| ambient_rh_pct | Ambient relative humidity, 0–100% |
| dew_point_c | Computed by Pi from ambient temperature and RH when both exist; Magnus approximation, a=17.62, b=243.12 °C; RH=0 leaves it blank |
| dew_point_margin_setpoint_c | Commanded safety margin above dew point, °C; no default implied |
| temp_coldest_surface_c | Measured coldest exposed coolant surface, °C; bulk coolant temperature is not a substitute |
| condensation_margin_c | Surface temperature minus dew point, °C; derived when both are available |
| temp_rack_inlet_air_c, temp_rack_exhaust_air_c | Rack air temperatures, °C |
| rack_fan_power_w, radiator_fan_power_w, pump_power_w, chiller_power_w | Separate measured electrical power, W |
| total_system_power_w | Measured total testbed electrical power, W; includes heat sources if in meter boundary |
| radiator_fan_rpm | Measured radiator fan speed |
| radiator_fan_setpoint_pct, chiller_setpoint_pct | Commanded actuator duty, 0–100% |
| coolant_temp_setpoint_c | Commanded coolant supply target, °C |
| node_N_temp_c | Measured node temperature, °C; N=1…8 |
| node_N_thermal_limit_c | Configured node maximum temperature, °C |
| node_N_cpu_util_pct | Node utilization, 0–100% |
| node_N_heat_power_w | Measured or calibrated heat input, W; document which |
| node_N_workload_setpoint_pct | Commanded node workload, 0–100% |

`temp_inlet_c` and `temp_outlet_c` refer to coolant. `fan_rpm` and `fan_setpoint_pct` refer to rack fans. `power_w` remains a legacy channel; record its meter boundary before use. Do not add it to named component power channels without checking for overlap. Record whether an absent chiller is truly absent; blank means unavailable, not measured zero.

The logger computes dew point and margin for analysis; it does not enforce control limits. Missing humidity or surface measurements must not be interpreted as proof of condensation safety. Calibration, sensor uncertainty, and a site-specific safety margin belong in the subsequent controller design.
