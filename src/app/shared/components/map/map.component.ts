import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, Input } from '@angular/core';
import * as L from 'leaflet';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  @Input() height = '400px';
  @Input() markers: any[] = [];
  @Input() center: [number, number] = [48.8566, 2.3522];
  @Input() zoom = 13;

  private map!: L.Map;
  private markerLayer!: L.LayerGroup;

  constructor() {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    if (!this.mapContainer) return;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: this.center,
      zoom: this.zoom
    });

    L.tileLayer(environment.mapTileUrl, {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.markerLayer = L.layerGroup().addTo(this.map);
    this.addMarkers();
  }

  addMarkers(): void {
    this.markerLayer.clearLayers();

    this.markers.forEach(marker => {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: marker.icon || '<div class="default-marker"></div>',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      L.marker([marker.lat, marker.lng], { icon })
        .addTo(this.markerLayer)
        .bindPopup(marker.popup || '');
    });
  }

  addMarker(lat: number, lng: number, popup?: string, icon?: string): void {
    const markerData = { lat, lng, popup, icon };
    this.markers.push(markerData);
    this.addMarkers();
  }

  clearMarkers(): void {
    this.markers = [];
    this.markerLayer.clearLayers();
  }

  setCenter(lat: number, lng: number): void {
    this.map.setView([lat, lng], this.zoom);
  }

  fitBounds(bounds: L.LatLngBoundsExpression): void {
    this.map.fitBounds(bounds);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}
