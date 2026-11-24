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
import asyncio
import json


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
            # Read venue data from court_info.json
            try:
                with open("court_info.json", "r") as f:
                    venues = json.load(f)
                return venues
            except Exception as e:
                print("Error loading court_info.json: ", str(e))
                return []

        @self.app.post("/availability")
        async def get_availability(payload: dict = Body(...)):
            try:
                venue_id = payload.get("venue")

                print("Selected venue id: ", venue_id)

                # Prepare all the dates and URLs that need to be fetched
                dates_to_fetch = []
                for i in range(7):  # next 7 days including today
                    date = dt.date.today() + dt.timedelta(days=i)
                    date_str = date.strftime("%Y-%m-%d")
                    dates_to_fetch.append(date_str)
                
                async def fetch_date_availability(client, date_str):
                    print(f"Fetching data for {date_str}...")
                    url = f"{self.base_url}?venueid={venue_id}&date={date_str}"
                    response = await client.get(url)
                    data = response.json()
                    return {"date": date_str, "availability": data}
                
                # Make all requests concurrently
                results = []
                async with httpx.AsyncClient(timeout=20.0) as client:
                    tasks = [fetch_date_availability(client, date_str) for date_str in dates_to_fetch]
                    results = await asyncio.gather(*tasks)

                print(f"Fetched availability for {len(results)} days")
                print(results)
                output = []
                for day in results:
                    date_obj = datetime.fromisoformat(day['date'])
                    day_of_week = date_obj.strftime("%A")
                    availability = day["availability"]
                    venue_details = availability["venueDetails"]

                    slot_counts = {}
                    print(f"Processing {len(venue_details)} courts for {day['date']}")
                    for court in venue_details:
                        for slot in court.get("availableSlots", []):
                            start_time = slot['startTime']
                            print(f"  Found available slot: {start_time} on court {court.get('courtName')}")
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

    def start(self, host="0.0.0.0", port=8000):
        uvicorn.run(self.app, host=host, port=port)

if __name__ == "__main__":
    availability_app = TennisCourtAvailability()
    availability_app.start()