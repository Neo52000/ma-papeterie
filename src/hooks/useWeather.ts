import { useQuery } from '@tanstack/react-query';

// Chaumont, Haute-Marne (52000)
const CHAUMONT_LAT = 48.1133;
const CHAUMONT_LON = 5.1393;

interface WeatherPeriod {
  label: string;
  sublabel: string;
  temp: number;
  icon: string;
  description: string;
  precipProbability: number;
}

interface OpenMeteoResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    weathercode: number[];
    precipitation_probability: number[];
  };
}

const WMO_CODES: Record<number, { icon: string; description: string }> = {
  0: { icon: '☀️', description: 'Ciel dégagé' },
  1: { icon: '🌤️', description: 'Principalement dégagé' },
  2: { icon: '⛅', description: 'Partiellement nuageux' },
  3: { icon: '☁️', description: 'Couvert' },
  45: { icon: '🌫️', description: 'Brouillard' },
  48: { icon: '🌫️', description: 'Brouillard givrant' },
  51: { icon: '🌦️', description: 'Bruine légère' },
  53: { icon: '🌦️', description: 'Bruine modérée' },
  55: { icon: '🌧️', description: 'Bruine dense' },
  56: { icon: '🌧️', description: 'Bruine verglaçante' },
  57: { icon: '🌧️', description: 'Bruine verglaçante forte' },
  61: { icon: '🌧️', description: 'Pluie légère' },
  63: { icon: '🌧️', description: 'Pluie modérée' },
  65: { icon: '🌧️', description: 'Pluie forte' },
  66: { icon: '🌧️', description: 'Pluie verglaçante' },
  67: { icon: '🌧️', description: 'Pluie verglaçante forte' },
  71: { icon: '❄️', description: 'Neige légère' },
  73: { icon: '❄️', description: 'Neige modérée' },
  75: { icon: '❄️', description: 'Neige forte' },
  77: { icon: '❄️', description: 'Grains de neige' },
  80: { icon: '🌦️', description: 'Averses légères' },
  81: { icon: '🌦️', description: 'Averses modérées' },
  82: { icon: '🌧️', description: 'Averses violentes' },
  85: { icon: '🌨️', description: 'Averses de neige' },
  86: { icon: '🌨️', description: 'Averses de neige fortes' },
  95: { icon: '⛈️', description: 'Orage' },
  96: { icon: '⛈️', description: 'Orage avec grêle légère' },
  99: { icon: '⛈️', description: 'Orage avec grêle forte' },
};

function getWeatherInfo(code: number) {
  return WMO_CODES[code] ?? { icon: '🌡️', description: 'Inconnu' };
}

function dominantWeatherCode(codes: number[]): number {
  if (codes.length === 0) return 0;
  // Return the most "severe" code (highest value = worst weather)
  return Math.max(...codes);
}

function aggregateHalfDay(
  data: OpenMeteoResponse['hourly'],
  dayOffset: number,
  startHour: number,
  endHour: number
): { temp: number; weatherCode: number; precipProbability: number } {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + dayOffset);
  const dateStr = baseDate.toISOString().slice(0, 10);

  const temps: number[] = [];
  const codes: number[] = [];
  const precips: number[] = [];

  for (let i = 0; i < data.time.length; i++) {
    const time = data.time[i];
    if (!time.startsWith(dateStr)) continue;
    const hour = parseInt(time.slice(11, 13), 10);
    if (hour >= startHour && hour < endHour) {
      temps.push(data.temperature_2m[i]);
      codes.push(data.weathercode[i]);
      precips.push(data.precipitation_probability[i]);
    }
  }

  if (temps.length === 0) {
    return { temp: 0, weatherCode: 0, precipProbability: 0 };
  }

  return {
    temp: Math.round(temps.reduce((a, b) => a + b, 0) / temps.length),
    weatherCode: dominantWeatherCode(codes),
    precipProbability: Math.max(...precips),
  };
}

async function fetchWeather(): Promise<WeatherPeriod[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${CHAUMONT_LAT}&longitude=${CHAUMONT_LON}&hourly=temperature_2m,weathercode,precipitation_probability&timezone=Europe/Paris&forecast_days=2`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur météo: ${response.status}`);

  const data: OpenMeteoResponse = await response.json();

  const periods: { label: string; sublabel: string; dayOffset: number; start: number; end: number }[] = [
    { label: "Aujourd'hui", sublabel: 'Matin', dayOffset: 0, start: 6, end: 12 },
    { label: "Aujourd'hui", sublabel: 'Après-midi', dayOffset: 0, start: 12, end: 18 },
    { label: 'Demain', sublabel: 'Matin', dayOffset: 1, start: 6, end: 12 },
    { label: 'Demain', sublabel: 'Après-midi', dayOffset: 1, start: 12, end: 18 },
  ];

  return periods.map(({ label, sublabel, dayOffset, start, end }) => {
    const agg = aggregateHalfDay(data.hourly, dayOffset, start, end);
    const info = getWeatherInfo(agg.weatherCode);
    return {
      label,
      sublabel,
      temp: agg.temp,
      icon: info.icon,
      description: info.description,
      precipProbability: agg.precipProbability,
    };
  });
}

export function useWeather() {
  return useQuery({
    queryKey: ['weather', 'chaumont'],
    queryFn: fetchWeather,
    staleTime: 30 * 60_000,
    retry: 2,
  });
}
