import datetime as dt
from datetime import datetime
import httpx
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import Request
import uvicorn
from fastapi import Body
from collections import defaultdict

VENUE_IDS = {
    "Clapham Common": "2fb20762-62d1-4fc7-961c-f4404d4d1ae8",
    "South Park": "af129600-b4f9-4f39-b181-698cacaad913",
    "Brockwell Park": "03a2d315-2b9a-411d-8891-1bfde4cb4cf3",
    "Kennington Park": "38f9b2bb-b840-45a9-9c6e-dc685f04ed25",
    "Streatham Vale Park": "29dfbcd8-c72b-4629-ba93-212c3d73ee6a",
    "Streatham Common": "5c1fcb26-be28-4ac4-932f-fc26e6207e90",
    "Larkhall Park": "9bf5a08b-35a4-4d93-806f-09362d110ebe",
    "Myatts Fields Park": "c7968b48-2c0c-4e2f-a2ae-850976a46f5e",
    "Hillside Gardens Park": "e37baae4-39b1-47b0-bd81-b2cdbb6f7a8f",
    "Vauxhall Park": "ed2c2180-e21f-494a-bf03-199755c45b64"
}


class TennisCourtAvailability:
    def __init__(self):
        self.app = FastAPI()
        self.base_url = "https://www.lta.org.uk/api/courtdetail/availability"
        self.app.mount("/static", StaticFiles(directory="static"), name="static")
        self.templates = Jinja2Templates(directory="templates")
        self.setup_routes()

    def setup_routes(self):
        @self.app.get("/")
        async def root(request: Request):
            return self.templates.TemplateResponse("index.html", {"request": request})

        @self.app.get("/venues")
        async def get_venues():
            # Return a list of venue names and IDs
            return [{"name": name, "id": vid} for name, vid in VENUE_IDS.items()]

        @self.app.post("/availability")
        async def get_availability(payload: dict = Body(...)):
            try:
                venue_id = payload.get("venue")
                slots = payload.get("slots", [])

                day_to_hours_map = defaultdict(list)
                for item in slots:
                    day_to_hours_map[item['day']].append(item['hour'])

                print("Selected venue id: ", venue_id)
                print("Number of selected slots: ", len(slots))

                results = []
                async with httpx.AsyncClient(timeout=20.0) as client:
                    for i in range(7):  # next 7 days including today
                        date = dt.date.today() + dt.timedelta(days=i)
                        weekday = date.weekday()
                        if weekday not in day_to_hours_map:
                            continue
                        date = (dt.date.today() + dt.timedelta(days=i)).strftime("%Y-%m-%d")
                        print(f"Fetching data for {date}...")
                        url = f"{self.base_url}?venueid={venue_id}&date={date}"
                        response = await client.get(url)
                        data = response.json()
                        results.append({ "date": date, "availability": data })

                print(f"Fetched availability for {len(results)} days")
                print(results)
                output = []
                for day in results:
                    print("here")
                    date_obj = datetime.fromisoformat(day['date'])
                    day_number = date_obj.weekday()
                    print("day number: ", day_number)
                    print("day to hours map: ", day_to_hours_map)
                    if day_number not in day_to_hours_map:
                        print(f"Skipping {day['date']} as no slots selected for this day")
                        continue  # Skip days not in selected slots

                    day_of_week = date_obj.strftime("%A")
                    availability = day["availability"]
                    venue_details = availability.get("venueDetails", [])
                    if not venue_details:
                        raise Exception("No venue details found in API response")

                    slot_counts = {}
                    print(f"Processing {len(venue_details)} courts for {day['date']}")
                    for court in venue_details:
                        for slot in court.get("availableSlots", []):
                            start_time = slot['startTime']
                            dt_start = datetime.fromisoformat(start_time)
                            dt_end = datetime.fromisoformat(slot['endTime'])
                            if dt_start.hour in day_to_hours_map[day_number]:
                                print(f"  Found available slot: {start_time} to {slot['endTime']} on court {court.get('courtName')}")
                                slot_counts[start_time] = slot_counts.get(start_time, 0) + 1

                    day_result = {
                        "date": day['date'],
                        "day_of_week": day_of_week,
                        "slots": [
                            {
                                "time": datetime.fromisoformat(slot_time).strftime("%H:%M"),
                                "courts_available": count
                            }
                            for slot_time, count in slot_counts.items()
                        ]
                    }
                    output.append(day_result)
            except Exception as e:
                print("Error fetching availability:", str(e))
                return JSONResponse(content={"error": "Failed to fetch availability"}, status_code=500)

            return JSONResponse(content=output)

    def start(self, host="127.0.0.1", port=8000):
        uvicorn.run(self.app, host=host, port=port)

if __name__ == "__main__":
    availability_app = TennisCourtAvailability()
    availability_app.start()