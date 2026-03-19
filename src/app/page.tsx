"use client";

import { FormEvent, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DotBackground from "@/components/dot-background";
import ThemeToggle from "@/components/theme-toggle";
import {
  fetchWeatherForLocation,
  formatTemperature,
  formatUpdatedTime,
  getIconAndLabel,
  type WeatherResult,
} from "@/lib/weather";

export default function Page() {
  const [locationValue, setLocationValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const helperTextId = "location-helper";
  const inputErrorId = "location-input-error";

  const iconLabel = useMemo(() => {
    if (!weather) return null;
    return getIconAndLabel(weather.weatherCode);
  }, [weather]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLoading) return;

    const raw = locationValue.trim();
    if (!raw) {
      setInputError("Please enter a location name.");
      setWeather(null);
      setErrorMessage(null);
      return;
    }

    setInputError(null);
    setIsLoading(true);
    setWeather(null);
    setErrorMessage(null);

    try {
      const data = await fetchWeatherForLocation(raw);
      setWeather(data);
      setErrorMessage(null);
    } catch (err: unknown) {
      const errObj = err as { code?: unknown; message?: unknown };
      const code = typeof errObj?.code === "string" ? errObj.code : "";
      const msg = typeof errObj?.message === "string" ? errObj.message : "";

      let message = "We were unable to fetch weather data right now. Please try again in a moment.";
      if (msg.includes("CITY_NOT_FOUND") || code === "CITY_NOT_FOUND") {
        message = "We could not find that location. Please check the spelling and try again.";
      }

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }

  const footerText = "Designed by Xiaoye Lin & built by AI · Data provided by Open-Meteo";

  return (
    <div className="relative min-h-screen bg-background">
      <DotBackground />
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center p-4">
        <Card className="relative z-10 w-full shadow-lg">
          <CardHeader>
            <div className="flex w-full items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Weather right now</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Search any location to see the current conditions.
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location-input">Location</Label>
                <Input
                  id="location-input"
                  value={locationValue}
                  onChange={(e) => setLocationValue(e.target.value)}
                  placeholder="e.g. London, Tokyo, New York"
                  autoComplete="off"
                  disabled={isLoading}
                  aria-invalid={!!inputError}
                  aria-describedby={`${helperTextId} ${inputError ? inputErrorId : ""}`.trim()}
                />
                <p id={helperTextId} className="text-sm text-muted-foreground">
                  {isLoading ? "Loading..." : "Type a location name and press Enter or Search."}
                </p>
                {inputError ? (
                  <p id={inputErrorId} className="text-sm text-destructive">
                    {inputError}
                  </p>
                ) : null}
              </div>

              <Button type="submit" disabled={isLoading}>
                Search
              </Button>
            </form>

            {/* Initial UX: no weather card, no global error alert until the user successfully searches. */}
            {weather ? (
              <section aria-live="polite">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <span aria-hidden="true" className="text-2xl">
                      {iconLabel?.icon ?? "☁️"}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="truncate text-lg font-medium">{iconLabel?.label ?? "Unknown"}</p>
                      <p className="text-right text-2xl font-semibold">
                        {formatTemperature(weather.temperatureC)}
                      </p>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Location: <span className="font-medium text-foreground">{weather.locationName}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatUpdatedTime(weather.updatedAtSeconds)}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            {errorMessage ? (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>

          <CardFooter className="flex flex-col items-start gap-3">
            <p className="w-full text-left text-xs text-muted-foreground">{footerText}</p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
