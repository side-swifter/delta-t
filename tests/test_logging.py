import csv,importlib.util,json,sys,tempfile,unittest
from datetime import datetime,timedelta,timezone
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'logging'))
from schema import FIELDS,validate_packet
from check_log import check
class LogChecks(unittest.TestCase):
    def packet(self):return dict(schema_version=1,device_id='esp32-01',boot_id='abc',seq=0,uptime_ms=1000,sensor_ok=True,temp_probe_1_c=23.5)
    def rows(self,n=3600):
        start=datetime(2026,10,4,tzinfo=timezone.utc)
        return [dict(timestamp_utc=(start+timedelta(seconds=i)).isoformat(),host_monotonic_ns=i*10**9,session_id='test',schema_version=1,device_id='esp32-01',boot_id='a',seq=i,uptime_ms=(i+1)*1000,sensor_ok=True,temp_probe_1_c=23.5) for i in range(n)]
    def report(self,rows):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'test.csv'
            with p.open('w',newline='') as f:
                w=csv.DictWriter(f,fieldnames=FIELDS);w.writeheader();w.writerows(rows)
            return check(p)
    def test_complete_run(self):self.assertTrue(self.report(self.rows())['pass'])
    def test_missing_sample(self):
        r=self.rows();del r[100];s=self.report(r);self.assertFalse(s['pass']);self.assertEqual(s['missing_samples'],1)
    def test_duplicate(self):
        r=self.rows();r.insert(100,r[100].copy());self.assertEqual(self.report(r)['duplicate_samples'],1)
    def test_short_run(self):self.assertFalse(self.report(self.rows(10))['pass'])
    def test_reset(self):
        r=self.rows();r[100]['boot_id']='b';self.assertFalse(self.report(r)['pass'])
    def test_failed_sensor(self):
        p=self.packet();p.update(sensor_ok=False,temp_probe_1_c=None);validate_packet(p)
        p['temp_probe_1_c']=-127
        with self.assertRaises(ValueError):validate_packet(p)
    def test_invalid_packet(self):
        p=self.packet();p['temp_probe_1_c']=float('nan')
        with self.assertRaises(ValueError):validate_packet(p)
        p=self.packet();p['seq']=True
        with self.assertRaises(ValueError):validate_packet(p)

class HybridSchemaChecks(unittest.TestCase):
    def test_dew_point_and_surface_margin(self):
        from schema import derive_fields
        p = LogChecks().packet()
        p.update(temp_ambient_c=25, ambient_rh_pct=50, temp_coldest_surface_c=17)
        r = derive_fields(validate_packet(p))
        self.assertAlmostEqual(r['dew_point_c'], 13.85, places=1)
        self.assertAlmostEqual(r['condensation_margin_c'], 3.15, places=1)
        self.assertNotIn('dew_point_c', p)

    def test_missing_and_zero_humidity(self):
        from schema import derive_fields
        p = LogChecks().packet()
        self.assertNotIn('dew_point_c', derive_fields(p))
        p.update(temp_ambient_c=25, ambient_rh_pct=0)
        self.assertIsNone(derive_fields(validate_packet(p))['dew_point_c'])

    def test_invalid_extended_sensor_fields(self):
        for key, value in [('ambient_rh_pct', 101), ('pump_power_w', -1),
                           ('node_1_cpu_util_pct', -2), ('control_mode', 'unknown'),
                           ('dew_point_margin_setpoint_c', -1)]:
            with self.subTest(key=key):
                p = LogChecks().packet(); p[key] = value
                with self.assertRaises(ValueError): validate_packet(p)

if __name__=='__main__':unittest.main()
