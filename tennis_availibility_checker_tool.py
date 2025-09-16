# script to check tennis court availability at a clapham common
# for the next 7 days. Use to test the lta api.

import requests
import datetime as dt
import json
from datetime import datetime


venue_id = "2fb20762-62d1-4fc7-961c-f4404d4d1ae8"
base_url = "https://www.lta.org.uk/api/courtdetail/availability"

results = []

for i in range(7):  # next 7 days inlcuding today
    date = (dt.date.today() + dt.timedelta(days=i)).strftime("%Y-%m-%d")
    url = f"{base_url}?venueid={venue_id}&date={date}"
    print(f"Fetching data for {date}...")

    response = requests.get(url)
    data = response.json()
    print("Data received")

    results.append({ "date": date, "availability": data })

for day in results:
    # Get day of week
    date_obj = datetime.fromisoformat(day['date'])
    day_of_week = date_obj.strftime("%A")
    print(f"Date: {day['date']} ({day_of_week})")
    availability = day["availability"]
    venue_details = availability["venueDetails"]

    # Dictionary to count available courts per slot start time
    slot_counts = {}

    # Check if weekend
    is_weekend = date_obj.weekday() >= 5  # 5 = Saturday, 6 = Sunday

    for court in venue_details:
        for slot in court["availableSlots"]:
            start_time = slot['startTime']
            dt_start = datetime.fromisoformat(start_time)
            dt_end = datetime.fromisoformat(slot['endTime'])
            # Only filter 9am-5pm for weekdays
            if is_weekend or (dt_start.hour < 9 or dt_end.hour > 17):
                slot_counts[start_time] = slot_counts.get(start_time, 0) + 1

    # Print summary for the day
    if slot_counts:
        for slot_time, count in slot_counts.items():
            time_only = datetime.fromisoformat(slot_time).strftime("%H:%M")
            print(f"{count} courts available at {time_only}")
            #print(f"  Time: {slot_time} - Courts available: {count}")
    else:
        print("No courts available outside 9am-5pm on weekdays or at any time on weekends.")
