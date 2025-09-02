// Mirror Prisma enum locally to avoid Vercel build issues
export enum ForecastModel {
  PROPHET = "PROPHET",
  ARIMA = "ARIMA",
  REGRESSION = "REGRESSION",
  LSTM = "LSTM",
  ENSEMBLE = "ENSEMBLE"
}
