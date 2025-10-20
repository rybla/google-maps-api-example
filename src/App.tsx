import { AdvancedMarker, APIProvider, Map } from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import z from "zod";
import "./App.css";
import "./Marker.css";
import { useSearchParams } from "react-router-dom";
import { Building, Coffee, ShoppingBasket, Utensils, X } from "lucide-react";

type Pos = z.infer<typeof Pos>;
const Pos = z.object({
  lat: z.number(),
  lng: z.number(),
});

type LocationType = z.infer<typeof LocationType>;
const LocationType = z.enum(["restaurant", "tea", "food-shop", "architecture"]);

type Location = z.infer<typeof Location>;
const Location = z.object({
  pos: Pos,
  name: z.string(),
  url: z.url(),
  imageUrl: z
    .optional(z.url())
    .describe("Thumbnail image that represents the location"),
  description: z.string(),
  rating: z.optional(z.number().describe("Rating out of 10")),
  address: z.optional(z.string()),
  type: z.optional(LocationType),
});

type Config = z.infer<typeof Config>;
const Config = z.object({
  center: Pos,
  locations: z.array(Location),
});

function LocationIcon({ type }: { type: LocationType | undefined }) {
  const icon = (() => {
    switch (type) {
      case "restaurant":
        return <Utensils />;
      case "food-shop":
        return <ShoppingBasket />;
      case "architecture":
        return <Building />;
      case "tea":
        return <Coffee />;
      default:
        return <X />;
    }
  })();

  return <div className="location-icon">{icon}</div>;
}

export function MapComponent(props: { config: Config }) {
  const [selectedMarkerName, setSelectedMarkerName] = useState<string | null>(
    null,
  );

  // Handle clicking on one of the `AdvancedMarker`s
  function handleMarkerClick(name: string) {
    setSelectedMarkerName(name);
  }

  const selectedLocation = props.config.locations.find(
    (loc) => loc.name == selectedMarkerName,
  );

  return (
    <div className="map-container">
      <Map
        className="map"
        mapId="default"
        // The default center is the position of the very first marker.
        defaultCenter={props.config.center}
        defaultZoom={12}
        gestureHandling={"greedy"}
        disableDefaultUI={true}
        colorScheme="FOLLOW_SYSTEM"
        renderingType="VECTOR"
      >
        {props.config.locations.map((loc) => (
          <AdvancedMarker
            key={loc.name}
            position={loc.pos}
            onClick={() => handleMarkerClick(loc.name)}
          >
            <div className={`location-marker ${loc.type}`}>
              <div className="location-name">{loc.name}</div>
              <LocationIcon type={loc.type} />
            </div>
          </AdvancedMarker>
        ))}
      </Map>
      {
        <div
          className={[
            "location-info",
            selectedLocation === undefined ? "hidden" : "",
          ].join(" ")}
        >
          {selectedLocation && (
            <>
              <div className="body">
                <div className="col1">
                  <div className="title">
                    <a href={selectedLocation.url} target="_blank">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${getDomainFromUrl(selectedLocation.url)}&sz=32`}
                      />
                      <div>{selectedLocation.name}</div>
                    </a>
                  </div>
                  {selectedLocation.rating !== undefined ? (
                    <div className="rating">
                      Rating: {selectedLocation.rating}/10
                    </div>
                  ) : null}
                  {selectedLocation.address !== undefined ? (
                    <div className="address">
                      <pre>{selectedLocation.address}</pre>
                    </div>
                  ) : null}
                  <div className="description">
                    <Markdown>{selectedLocation.description}</Markdown>
                  </div>
                </div>
                <div className="col2">
                  {selectedLocation.imageUrl && (
                    <img
                      className="thumbnail"
                      src={selectedLocation.imageUrl}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      }
    </div>
  );
}

export default function Home() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Google Maps API Key is missing. Please add it to your `.env.development` file like so: `VITE_GOOGLE_MAPS_API_KEY="YOUR_API_KEY_HERE"`',
    );
  }
  const [searchParams] = useSearchParams();

  const [config, setConfig] = useState<Config | null>(null);

  useEffect(
    () => {
      (async () => {
        const name = searchParams.get("config");
        if (name === null) {
          alert("You must provide a `config` search parameter");
          return;
        }
        const result = await fetch(`./${name}.json`);
        const data = await result.json();
        const config = Config.parse(data);
        setConfig(config);
      })();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config],
  );

  return (
    <APIProvider apiKey={apiKey} libraries={["marker"]}>
      <div className="page">{config && <MapComponent config={config} />}</div>
    </APIProvider>
  );
}

function getDomainFromUrl(urlString: string) {
  try {
    const url = new URL(urlString);
    return url.hostname;
  } catch {
    console.error("Invalid URL:", urlString);
    return null;
  }
}
