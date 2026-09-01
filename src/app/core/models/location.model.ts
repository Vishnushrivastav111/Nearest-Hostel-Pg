export interface GeoPoint {
  readonly latitude: number;
  readonly longitude: number;
}

export interface DetectedPlace {
  readonly city: string;
  readonly area: string;
  readonly label: string;
  readonly point: GeoPoint;
}

export interface PlaceCatalog {
  readonly cities: string[];
  readonly areasByCity: Readonly<Record<string, string[]>>;
}

export interface HostelDistance {
  readonly km: number | null;
}
