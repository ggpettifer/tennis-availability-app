import datetime as dt
from datetime import datetime
import httpx
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import Request
import json
import uvicorn
from pydantic import BaseModel

class Settings(BaseModel):
    selected_venues: list[str] = []
    


class TennisCourtAvailability:
    def __init__(self):
        self.app = FastAPI()
        self.venue_id = "2fb20762-62d1-4fc7-961c-f4404d4d1ae8"
        self.base_url = "https://www.lta.org.uk/api/courtdetail/availability"
        self.app.mount("/static", StaticFiles(directory="static"), name="static")
        self.templates = Jinja2Templates(directory="templates")
        self.setup_routes()
        self.selected_venues = []

    def setup_routes(self):
        @self.app.get("/")
        async def root(request: Request):
            return self.templates.TemplateResponse("index.html", {"request": request})

        @self.app.get("/availability")
        async def get_availability():
            results = []
            async with httpx.AsyncClient(timeout=20.0) as client:
                for i in range(7):  # next 7 days including today
                    date = (dt.date.today() + dt.timedelta(days=i)).strftime("%Y-%m-%d")
                    print(f"Fetching data for {date}...")
                    url = f"{self.base_url}?venueid={self.venue_id}&date={date}"
                    response = await client.get(url)
                    data = response.json()
                    results.append({ "date": date, "availability": data })

            output = []
            for day in results:
                date_obj = datetime.fromisoformat(day['date'])
                day_of_week = date_obj.strftime("%A")
                availability = day["availability"]
                venue_details = availability.get("venueDetails", [])

                slot_counts = {}
                is_weekend = date_obj.weekday() >= 5  # 5 = Saturday, 6 = Sunday

                for court in venue_details:
                    for slot in court.get("availableSlots", []):
                        start_time = slot['startTime']
                        dt_start = datetime.fromisoformat(start_time)
                        dt_end = datetime.fromisoformat(slot['endTime'])
                        # Only filter 9am-5pm for weekdays
                        if is_weekend or (dt_start.hour < 9 or dt_end.hour > 17):
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

            return JSONResponse(content=output)

    def start(self, host="127.0.0.1", port=8000):
        uvicorn.run(self.app, host=host, port=port)

if __name__ == "__main__":
    availability_app = TennisCourtAvailability()
    availability_app.start()