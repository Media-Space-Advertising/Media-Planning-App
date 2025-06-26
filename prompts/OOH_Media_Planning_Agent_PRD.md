
# 🧠 OOH Media Planning Agent – MVP PRD (v1)

## 🗂 Overview
This agent is a browser-based proof-of-concept app that speeds up the out-of-home (OOH) media planning process. It ingests large structured datasets of media sites (via Google Sheets) and allows users to filter, plan, and visualize viable media buys based on budget, proximity, and format — all via an interactive map and scenario toggling.

## 🎯 Goal of MVP
To enable planners to:
- Input a target postcode (or multiple)
- Set a media budget
- Choose preferred formats (e.g. 6-sheet, D48)
- Instantly visualize which sites can be afforded and where they are
- Toggle scenarios quickly to save time compared to manual review

## ✅ Success Criteria
The agent is considered a successful MVP if it can:
- Read structured OOH site data from a Google Sheet
- Filter sites based on:
  - Budget
  - Format
  - Proximity to input postcode(s)
- Plot filtered sites on a map with coordinates
- Refresh dynamically when filters change
- Display a count of selected sites and total spend

## 🛠 Tech Stack

| Component        | Technology                    |
|------------------|-------------------------------|
| Frontend         | React                         |
| Data Source      | Google Sheets API             |
| Mapping          | Leaflet.js / Mapbox / Google Maps JS SDK |
| Backend (if needed) | Node.js or serverless (optional) |
| Hosting (MVP)    | Local browser (via Cursor dev) |
| Codebase         | GitHub + Cursor IDE           |

## 📥 Inputs

Google Sheet with media site data including:
- Media owner
- Format
- Illumination
- Address & postcode
- Latitude / Longitude
- Unique ID
- Cost
- Availability
- Distance to target (if precomputed) or coordinates to calculate

## 🧑‍💻 User Inputs (via UI)
- 📍 Target postcode(s) – text input  
- 💰 Budget – numeric input or slider  
- 🧱 Media format – dropdown or checkbox (multi-select)  
- ✅ Optional: availability filter (yes/no)  

## 📊 App Logic & Flow
1. **Connect to Google Sheets API** to ingest media site dataset.
2. **Parse data and structure it in memory** (e.g. list of JS objects).
3. **Calculate proximity to target postcode(s)** (via external geolocation API).
4. **Filter sites** by budget, format, and location.
5. **Select subset of sites** that maximize value within budget (simple sum logic for now).
6. **Plot selected sites** using coordinates on a map component.
7. **Allow user to tweak inputs** (postcode, budget, format) and dynamically refresh results.

## 🗺 Map Output (MVP)
- Use coordinates to place markers
- Display basic tooltip with: site name, format, cost, media owner
- Map updates in real time as filters change

## 📤 Outputs (Future Phase)
- [ ] Download selected sites as CSV or Excel
- [ ] Generate a rationale summary (optional AI content)
- [ ] Screenshot or export map view

## 👤 Example User Story
> As a media planner, I want to upload OOH media data and enter a client budget and location, so that I can see what sites I can afford and where they’re located — without manually checking each file.
