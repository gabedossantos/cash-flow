
# Cashflow Dashboard

A modern, open-source dashboard for monitoring cash flow, risk alerts, forecasting, and financial KPIs. Built with Next.js, TypeScript, TailwindCSS, and Prisma.

## Features

- Interactive cash flow charts and dashboards
- Risk alerts and recommendations
- KPI overview and segment analysis
- Monte Carlo simulation panel
- Forecasting tools
- API endpoints for cashflow, forecasts, health, KPIs, recommendations, segments, and simulation
- Responsive UI with shadcn/ui components
- Framer Motion animations
- SQLite (development) and Postgres (production) support via Prisma

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm
- SQLite (for local dev) or Postgres (for production)

### Installation
1. Clone the repository:
	```sh
	git clone https://github.com/gabedossantos/cashflow-dashboard.git
	cd cashflow-dashboard
	```
2. Install dependencies:
	```sh
	npm install
	```
3. Copy environment variables template and configure as needed:
	```sh
	cp .env.example .env
	```
4. Generate Prisma client:
	```sh
	npx prisma generate
	```
5. Run the development server:
	```sh
	npm run dev
	```

### Build & Production
To build for production:
```sh
npm run build
```
To start the production server:
```sh
npm start
```

## Project Structure
- `app/` – Next.js app directory (routes, layouts, API endpoints)
- `components/` – UI and dashboard components
- `hooks/` – Custom React hooks
- `lib/` – Utility libraries (analytics, ML, types, etc.)
- `prisma/` – Prisma schema and migrations
- `scripts/` – Utility scripts (e.g., seed data)
- `tests/` – Unit and API tests

## API Endpoints
- `/api/alerts` – Risk alerts
- `/api/cashflow` – Cash flow data
- `/api/forecasts` – Forecasting
- `/api/health` – Health checks
- `/api/kpis` – Key performance indicators
- `/api/recommendations` – Recommendations
- `/api/segments` – Segment analysis
- `/api/simulation` – Monte Carlo simulation

## Testing
Run unit and API tests with:
```sh
npm test
```

## Contributing
Contributions are welcome! Please open issues or pull requests for improvements, bug fixes, or new features.

## License
This project is licensed under the MIT License. See `LICENSE` for details.

---

For questions or support, open an issue on GitHub.
