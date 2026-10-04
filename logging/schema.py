import math
FIELDS = ["timestamp_utc", "host_monotonic_ns", "session_id", "schema_version", "device_id", "boot_id", "seq", "uptime_ms", "sensor_ok", "temp_probe_1_c", "temp_inlet_c", "temp_outlet_c", "temp_ambient_c", "flow_lpm", "fan_rpm", "pump_rpm", "power_w", "cpu_util_pct", "temp_setpoint_c", "fan_setpoint_pct", "pump_setpoint_pct", "workload_setpoint_pct", "control_mode"]
# Append-only extension: original firmware v0 packets remain valid.
FIELDS += ["ambient_rh_pct", "dew_point_c", "dew_point_margin_setpoint_c",
           "temp_coldest_surface_c", "condensation_margin_c",
           "temp_rack_inlet_air_c", "temp_rack_exhaust_air_c",
           "rack_fan_power_w", "radiator_fan_power_w", "pump_power_w",
           "chiller_power_w", "total_system_power_w", "radiator_fan_rpm",
           "radiator_fan_setpoint_pct", "coolant_temp_setpoint_c",
           "chiller_setpoint_pct"]
for node in range(1, 9):
    FIELDS += [f"node_{node}_temp_c", f"node_{node}_thermal_limit_c",
               f"node_{node}_cpu_util_pct", f"node_{node}_heat_power_w",
               f"node_{node}_workload_setpoint_pct"]
OPTIONAL = FIELDS[10:]

def dew_point_c(temperature, rh):
    """Magnus approximation over liquid water; RH=0 has no finite dew point."""
    if rh == 0:
        return None
    a, b = 17.62, 243.12
    gamma = math.log(rh / 100.0) + a * temperature / (b + temperature)
    return b * gamma / (a - gamma)

def derive_fields(packet):
    packet = packet.copy()
    temperature, rh = packet.get("temp_ambient_c"), packet.get("ambient_rh_pct")
    if temperature is not None and rh is not None:
        packet["dew_point_c"] = dew_point_c(temperature, rh)
    surface, dew = packet.get("temp_coldest_surface_c"), packet.get("dew_point_c")
    if surface is not None and dew is not None:
        packet["condensation_margin_c"] = surface - dew
    return packet
def validate_packet(p):
    if not isinstance(p, dict) or p.get("schema_version") != 1:
        raise ValueError("unsupported packet schema")
    for k in ("device_id", "boot_id"):
        if not isinstance(p.get(k), str) or not p[k]: raise ValueError(k)
    for k in ("seq", "uptime_ms"):
        if type(p.get(k)) is not int or p[k] < 0: raise ValueError(k)
    if type(p.get("sensor_ok")) is not bool: raise ValueError("sensor_ok")
    t = p.get("temp_probe_1_c")
    if p["sensor_ok"]:
        if type(t) not in (float, int) or not math.isfinite(t) or not -55 <= t <= 125: raise ValueError("temperature")
    elif t is not None: raise ValueError("failed sensor must report null")
    for k in OPTIONAL:
        v = p.get(k)
        if v is not None and k != "control_mode" and (type(v) not in (float, int) or not math.isfinite(v)):
            raise ValueError(k)
    for k in OPTIONAL:
        v = p.get(k)
        if v is None: continue
        if k.endswith("_pct") and not 0 <= v <= 100:
            raise ValueError(k + " outside 0–100")
        if (k.endswith("_power_w") or k in ("power_w", "flow_lpm") or k.endswith("_rpm")) and v < 0:
            raise ValueError(k + " must be nonnegative")
    if p.get("control_mode") is not None and p["control_mode"] not in ("off", "manual", "reactive", "predictive"):
        raise ValueError("control_mode")
    if p.get("temp_ambient_c") is not None and not -40 <= p["temp_ambient_c"] <= 80:
        raise ValueError("temp_ambient_c outside approximation range")
    if p.get("dew_point_margin_setpoint_c") is not None and p["dew_point_margin_setpoint_c"] < 0:
        raise ValueError("negative dew point safety margin")
    return p
