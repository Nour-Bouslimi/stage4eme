import {
  Component,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ElementRef,
  ViewChild,
  Input
} from '@angular/core';
import * as L from 'leaflet';
import { environment } from '../../../../environments/environment';

type TrackingMarker = {
  lat: number;
  lng: number;
  popup?: string;
  icon?: string;
  kind?: 'departure' | 'destination' | 'driver';
};

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  @Input() height = '400px';
  @Input() markers: TrackingMarker[] = [];
  @Input() center: [number, number] = [34.0, 9.0];
  @Input() zoom = 7;
  @Input() polyline: [number, number][] = [];
  @Input() fitToMarkers = true;

  private map: L.Map | null = null;
  private markerLayer: L.LayerGroup | null = null;
  private polylineLayer: L.LayerGroup | null = null;

  ngAfterViewInit(): void {
    this.initMap();
    this.refreshMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) {
      return;
    }

    if (changes['markers'] || changes['polyline']) {
      this.refreshMap();
      return;
    }

    if (changes['center'] && !this.fitToMarkers) {
      this.map.setView(this.center, this.zoom);
      this.scheduleResize();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initMap(): void {
    if (!this.mapContainer || this.map) {
      return;
    }

    this.map = L.map(this.mapContainer.nativeElement, {
      center: this.center,
      zoom: this.zoom,
      zoomControl: true
    });

    L.tileLayer(environment.mapTileUrl, {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      detectRetina: false
    }).addTo(this.map);

    this.markerLayer = L.layerGroup().addTo(this.map);
    this.polylineLayer = L.layerGroup().addTo(this.map);
  }

  private refreshMap(): void {
    if (!this.map || !this.markerLayer || !this.polylineLayer) {
      return;
    }

    this.markerLayer.clearLayers();
    this.polylineLayer.clearLayers();

    this.addPolyline();
    this.addMarkers();
    this.adjustView();
    this.scheduleResize();
  }

  private addMarkers(): void {
    if (!this.markerLayer) {
      return;
    }

    this.markers.forEach((marker) => {
      let icon;

      if (marker.icon) {
        icon = L.divIcon({
          html: marker.icon,
          className: '',
          iconSize: [48, 48],
          iconAnchor: [24, 48],
          popupAnchor: [0, -48]
        });
      } else {
        icon = L.divIcon({
          className: 'custom-marker',
          html: this.buildMarkerHtml(marker.kind),
          iconSize: [40, 40],
          iconAnchor: [20, 40]
        });
      }

      L.marker([marker.lat, marker.lng], { icon })
        .addTo(this.markerLayer!)
        .bindPopup(marker.popup || '');
    });
  }

  private addPolyline(): void {
    if (!this.polylineLayer || this.polyline.length === 0) {
      return;
    }

    L.polyline(this.polyline, {
      color: '#FF0080',
      weight: 5,
      opacity: 1,
      lineJoin: 'round',
      lineCap: 'round'
    }).addTo(this.polylineLayer);
  }

  private adjustView(): void {
    if (!this.map) {
      return;
    }

    if (this.fitToMarkers) {
      const boundsPoints: L.LatLngExpression[] = [
        ...this.markers.map((marker) => [marker.lat, marker.lng] as L.LatLngTuple),
        ...this.polyline
      ];

      if (boundsPoints.length > 0) {
        if (boundsPoints.length === 1) {
          const point = boundsPoints[0] as [number, number];
          this.map.setView(point, Math.max(this.zoom, 12));
        } else {
          this.map.fitBounds(L.latLngBounds(boundsPoints), { padding: [60, 60], maxZoom: 13 });
        }

        return;
      }
    }

    this.map.setView(this.center, this.zoom);
  }

  private buildMarkerHtml(kind?: 'departure' | 'destination' | 'driver'): string {
    switch (kind) {
      case 'departure':
        return '<div class="tracking-pin tracking-pin--departure" aria-label="Départ"><span>📍</span></div>';
      case 'destination':
        return '<div class="tracking-pin tracking-pin--destination" aria-label="Destination"><span>🏁</span></div>';
      case 'driver':
        return '<div class="tracking-pin tracking-pin--driver" aria-label="Livreur"><span>🚚</span></div>';
      default:
        return '<div class="tracking-pin tracking-pin--default"><span></span></div>';
    }
  }

  private scheduleResize(): void {
    if (!this.map) {
      return;
    }

    const refresh = () => {
      if (!this.map) {
        return;
      }

      this.map.invalidateSize(true);
    };

    setTimeout(refresh, 0);
    setTimeout(refresh, 200);
  }
}
