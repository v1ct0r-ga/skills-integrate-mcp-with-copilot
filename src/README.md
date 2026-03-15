# Mergington High School Activities API

A super simple FastAPI application that allows students to view and sign up for extracurricular activities.

## Features

- View all available extracurricular activities
- Teacher login for admin mode
- Teachers can sign up students for activities
- Teachers can unregister students from activities
- Students can still view activity rosters in read-only mode

## Getting Started

1. Install the dependencies:

   ```
   pip install fastapi uvicorn
   ```

2. Run the application:

   ```
   python app.py
   ```

3. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint                                                          | Description                                                         |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/activities`                                                     | Get all activities with their details and current participant count |
| POST   | `/auth/login`                                                     | Teacher login with `username` and `password`                       |
| GET    | `/auth/me`                                                        | Validate current teacher session (`X-Teacher-Token` header)        |
| POST   | `/auth/logout`                                                    | Logout teacher session (`X-Teacher-Token` header)                  |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu` | Register a student (teacher only)                                  |
| DELETE | `/activities/{activity_name}/unregister?email=student@mergington.edu` | Unregister a student (teacher only)                            |

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

All data is stored in memory, which means data will be reset when the server restarts.

## Teacher Accounts

Teacher usernames and passwords are stored in `teachers.json` and checked by the backend.

Default sample credentials:

- `teacher.alex` / `mergington123`
- `teacher.jamie` / `classroom456`
