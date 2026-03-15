"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
import json
import secrets
from pathlib import Path
from pydantic import BaseModel

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# Teacher credentials are stored in a json file, while sessions stay in memory.
teachers_file = current_dir / "teachers.json"
teacher_sessions = {}


class TeacherLoginRequest(BaseModel):
    username: str
    password: str


def load_teachers() -> dict:
    if not teachers_file.exists():
        return {}

    with open(teachers_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    teachers = data.get("teachers", [])
    return {
        teacher["username"]: teacher["password"]
        for teacher in teachers
        if "username" in teacher and "password" in teacher
    }


def require_teacher_session(token: str | None) -> str:
    if not token or token not in teacher_sessions:
        raise HTTPException(status_code=401, detail="Teacher login required")
    return teacher_sessions[token]

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities


@app.post("/auth/login")
def teacher_login(payload: TeacherLoginRequest):
    teachers = load_teachers()
    if payload.username not in teachers or teachers[payload.username] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid teacher credentials")

    token = secrets.token_urlsafe(24)
    teacher_sessions[token] = payload.username
    return {"token": token, "username": payload.username}


@app.get("/auth/me")
def teacher_me(x_teacher_token: str | None = Header(default=None, alias="X-Teacher-Token")):
    username = require_teacher_session(x_teacher_token)
    return {"username": username}


@app.post("/auth/logout")
def teacher_logout(x_teacher_token: str | None = Header(default=None, alias="X-Teacher-Token")):
    require_teacher_session(x_teacher_token)
    teacher_sessions.pop(x_teacher_token, None)
    return {"message": "Logged out"}


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(
    activity_name: str,
    email: str,
    x_teacher_token: str | None = Header(default=None, alias="X-Teacher-Token")
):
    """Sign up a student for an activity"""
    teacher_username = require_teacher_session(x_teacher_token)

    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Validate activity still has available spots
    if len(activity["participants"]) >= activity["max_participants"]:
        raise HTTPException(
            status_code=400,
            detail="Activity is full"
        )

    # Add student
    activity["participants"].append(email)
    return {
        "message": f"Signed up {email} for {activity_name}",
        "teacher": teacher_username
    }


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(
    activity_name: str,
    email: str,
    x_teacher_token: str | None = Header(default=None, alias="X-Teacher-Token")
):
    """Unregister a student from an activity"""
    teacher_username = require_teacher_session(x_teacher_token)

    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    return {
        "message": f"Unregistered {email} from {activity_name}",
        "teacher": teacher_username
    }
