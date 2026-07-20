import { useEffect, useState } from "react";

const Weather = ({ variant = "widget" }) => {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=21.03&longitude=105.85&current=temperature_2m,wind_speed_10m"
    )
      .then((res) => res.json())
      .then((data) => setWeather(data.current));
  }, []);

  if (!weather) return null;

  if (variant === "header") {
    return (
      <div className="flex items-center gap-2 bg-sky-100/50 px-3 py-1.5 rounded-full border border-sky-200/50 backdrop-blur-sm">
        <span className="text-xl">🌤️</span>
        <div className="flex flex-col leading-none">
          <span className="font-bold text-slate-700 text-sm">{Math.round(weather.temperature_2m)}°C</span>
          <span className="text-[10px] text-slate-500 font-medium">Hà Nội</span>
        </div>
      </div>
    );
  }

  
};

export default Weather;
