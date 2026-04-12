

# NBA Player Card Catalogue 🏀

A digital trading card collection for your son featuring every active NBA player with real stats.

## Design
- **Modern/clean card style** with large, bold stat numbers
- Purple-to-blue gradient accents, white cards, clean typography
- Responsive grid layout that looks great on desktop and mobile

## Pages & Features

### 1. Home / Card Grid View
- Search bar to find players by name
- Filter chips: by **team** and by **position** (PG, SG, SF, PF, C)
- Grid of player cards showing: name, team, position, and key stats (PPG, RPG, APG, MIN) in large numbers
- Toggle button to switch between **Card Grid** and **Team Browse** views

### 2. Team Browse View
- All 30 NBA teams displayed with logos/colors
- Click a team to see its roster as a card grid
- Shows team W-L record at the top

### 3. Player Detail (click-to-expand modal)
When you click any card, a modal opens with the full "back of the card" info:
- **Stats**: PPG, RPG, APG, minutes per game (large numbers)
- **Team Record**: current team W-L
- **Career History**: all teams they've played for
- **Draft Info**: round, pick number, year
- **College**: where they played
- **Position**: primary position

## Data Source
- **balldontlie.io API** (free, no key required) for live player data and season stats
- Fallback: if API is down, show cached/sample data so the app still works

## Tech
- React + Tailwind (already set up)
- TanStack React Query for data fetching and caching
- Framer Motion for smooth card hover animations and modal transitions

