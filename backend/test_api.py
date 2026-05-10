"""
Comprehensive API endpoint tests for Pipeline Intelligence Backend
"""
import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"
RESULTS = []

def test_endpoint(name, method, endpoint, payload=None):
    """Test a single endpoint and record results"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        else:
            response = requests.post(url, json=payload, timeout=5)
        
        status_ok = 200 <= response.status_code < 300
        result = {
            "endpoint": name,
            "url": endpoint,
            "method": method,
            "status_code": response.status_code,
            "success": status_ok,
            "response": response.json() if response.text else None,
            "error": None
        }
        RESULTS.append(result)
        return result
    except Exception as e:
        result = {
            "endpoint": name,
            "url": endpoint,
            "method": method,
            "status_code": None,
            "success": False,
            "response": None,
            "error": str(e)
        }
        RESULTS.append(result)
        return result

print("=" * 80)
print("PIPELINE INTELLIGENCE BACKEND - COMPREHENSIVE TEST SUITE")
print("=" * 80)
print(f"\nTesting API at: {BASE_URL}")
print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")

# ====================  ROOT ENDPOINT ====================
print("\n[1/8] Testing ROOT Endpoint...")
result = test_endpoint(
    "GET /",
    "GET",
    "/"
)
print(f"  Status: {result['status_code']} - {'✅ PASS' if result['success'] else '❌ FAIL'}")
if result['response']:
    print(f"  Response: {json.dumps(result['response'], indent=2)[:200]}...")

# ====================  HEALTH CHECK ====================
print("\n[2/8] Testing HEALTH Endpoint...")
result = test_endpoint(
    "GET /api/health",
    "GET",
    "/api/health"
)
print(f"  Status: {result['status_code']} - {'✅ PASS' if result['success'] else '❌ FAIL'}")
if result['response']:
    print(f"  ML Ready: {result['response'].get('ml_ready', 'N/A')}")

# ====================  PREDICTION ====================
print("\n[3/8] Testing PREDICTION Endpoint...")
result = test_endpoint(
    "POST /api/predict",
    "POST",
    "/api/predict",
    {
        "temperature": 15.0,
        "solar_radiation": 200.0,
        "flow_rate": 50.0,
        "time_of_day": 12,
        "day_of_year": 130
    }
)
print(f"  Status: {result['status_code']} - {'✅ PASS' if result['success'] else '❌ FAIL'}")
if result['response']:
    pressure = result['response'].get('predicted_pressure_bar', 'N/A')
    print(f"  Predicted Pressure: {pressure} bar")

# ====================  HYDRATE RISK ====================
print("\n[4/8] Testing HYDRATE RISK Endpoint...")
result = test_endpoint(
    "POST /api/hydrate-risk",
    "POST",
    "/api/hydrate-risk",
    {
        "temperature": 2.0,
        "pressure": 130.0
    }
)
print(f"  Status: {result['status_code']} - {'✅ PASS' if result['success'] else '❌ FAIL'}")
if result['response']:
    at_risk = result['response'].get('is_at_risk', 'N/A')
    print(f"  At Risk: {at_risk}")

# ====================  ALERTS ====================
print("\n[5/8] Testing ALERTS Endpoint...")
result = test_endpoint(
    "POST /api/alerts",
    "POST",
    "/api/alerts",
    {
        "predicted_pressure": 155.0,
        "temperature": 5.0,
        "solar_radiation": 700.0,
        "flow_rate": 59.0,
        "pressure_threshold": 140,
        "anomaly_threshold": 58
    }
)
print(f"  Status: {result['status_code']} - {'✅ PASS' if result['success'] else '❌ FAIL'}")
if result['response']:
    alerts = result['response'].get('alerts', [])
    status = result['response'].get('system_status', 'N/A')
    print(f"  System Status: {status}")
    print(f"  Alert Count: {len(alerts)}")
    for alert in alerts[:2]:
        print(f"    - {alert.get('code', 'N/A')}: {alert.get('severity', 'N/A')}")

# ====================  EARTHQUAKE PROXIMITY ====================
print("\n[6/8] Testing EARTHQUAKE PROXIMITY Endpoint...")
result = test_endpoint(
    "POST /api/earthquake-proximity",
    "POST",
    "/api/earthquake-proximity",
    {
        "pipeline_latitude": 40.0,
        "pipeline_longitude": 70.0,
        "danger_distance_km": 5.0,
        "min_magnitude": 4.0
    }
)
print(f"  Status: {result['status_code']} - {'✅ PASS' if result['success'] else '❌ FAIL'}")
if result['response']:
    count = result['response'].get('count', 0)
    alert_level = result['response'].get('alert_level', 'N/A')
    print(f"  Alert Level: {alert_level}")
    print(f"  Nearby Events: {count}")

# ====================  SEGMENTS ====================
print("\n[7/8] Testing SEGMENTS Endpoint...")
result = test_endpoint(
    "GET /api/segments",
    "GET",
    "/api/segments"
)
print(f"  Status: {result['status_code']} - {'✅ PASS' if result['success'] else '❌ FAIL'}")
if result['response']:
    segments = result['response'].get('segments', [])
    total_anomalies = result['response'].get('total_anomalies', 0)
    print(f"  Segments: {len(segments)}")
    print(f"  Total Anomalies: {total_anomalies}")
    for seg in segments[:3]:
        print(f"    - Segment {seg.get('segment_id', 'N/A')}: {seg.get('alert_status', 'N/A')}")

# ====================  ROUTE ANALYSIS ====================
print("\n[8/8] Testing ROUTE ANALYSIS Endpoint...")
result = test_endpoint(
    "POST /api/route-analysis",
    "POST",
    "/api/route-analysis",
    {
        "start_node": "N001",
        "end_node": "N010"
    }
)
print(f"  Status: {result['status_code']} - {'✅ PASS' if result['success'] else '❌ FAIL'}")
if result['response']:
    found = result['response'].get('path_found', False)
    distance = result['response'].get('total_distance_km', 'N/A')
    print(f"  Route Found: {found}")
    if found:
        print(f"  Distance: {distance} km")

# ====================  SUMMARY ====================
print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)

passed = sum(1 for r in RESULTS if r['success'])
total = len(RESULTS)
pass_rate = (passed / total * 100) if total > 0 else 0

print(f"\n✅ Passed: {passed}/{total} ({pass_rate:.0f}%)")
print(f"❌ Failed: {total - passed}/{total}")

print("\nDetailed Results:")
print("-" * 80)
for r in RESULTS:
    status = "✅" if r['success'] else "❌"
    print(f"{status} {r['method']:6} {r['endpoint']:30} | Status: {r['status_code'] or 'ERROR':5} | {r['error'][:40] if r['error'] else 'OK'}")

print("\n" + "=" * 80)
if passed == total:
    print("🎉 ALL TESTS PASSED! Backend is operational.")
else:
    print(f"⚠️  {total - passed} test(s) failed. Review details above.")
print("=" * 80)
