# Developer instructions

## Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB 7.0
- Network Rail open data account — [register here](https://publicdatafeeds.networkrail.co.uk)

## First-time setup

```bash
git clone https://github.com/yourname/railtrack.git
cd railtrack

# Python env
python -m venv venv && source venv/bin/activate
pip install -e services/feed services/api

# Frontend
cd frontend && npm install && cd ..

# Credentials
cp .env.example .env
# fill in NR_USER and NR_PASS in .env

# Create MongoDB indexes
make migrate
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `NR_USER` | — | Network Rail open data email |
| `NR_PASS` | — | Network Rail open data password |
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGO_DB` | `railtrack` | Database name |
| `SHARED_PATH` | `./shared` | Path to reference data directory |
| `IPC_SOCKET` | `/tmp/nr_feed.sock` | Unix socket path shared between feed and API |
| `TRAIN_MAX_AGE_H` | `6` | Hours before a stale train is evicted from state |
| `MAX_JOURNEY` | `150` | Max stops recorded per train |
| `LOG_LEVEL` | `INFO` | Python log level |

## Running the app

### Local (three terminals)

```bash
# Terminal 1 — Feed
source venv/bin/activate
SHARED_PATH=./shared PYTHONPATH=services/feed/src python -m feed.main

# Terminal 2 — API
source venv/bin/activate
SHARED_PATH=./shared PYTHONPATH=services/api/src uvicorn api.main:app --port 8000

# Terminal 3 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:5173**

### Docker

```bash
docker compose up --build
cd frontend && npm run dev   # frontend still runs locally
```

### Makefile shortcuts

```bash
make up             # docker compose up --build -d
make down           # docker compose down
make logs           # tail all service logs
make migrate        # run MongoDB migrations
make frontend-dev   # cd frontend && npm run dev
```

## Updating station coordinates

```bash
source venv/bin/activate
python scripts/fetch_junction_coords.py
```
