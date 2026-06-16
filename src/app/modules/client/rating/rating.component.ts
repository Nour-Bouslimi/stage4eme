import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Mission } from '../../../core/models/mission.model';
import { MissionService } from '../../../core/services/mission.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { User } from '../../../core/models/user.model';

type RatingTag = {
  value: string;
  label: string;
};

@Component({
  selector: 'app-rating',
  templateUrl: './rating.component.html',
  styleUrls: ['./rating.component.css']
})
export class RatingComponent implements OnInit {
  missionId = '';
  mission: Mission | null = null;
  rating = 0;
  selectedTags: string[] = [];
  comment = '';
  loading = true;
  submitting = false;
  submitted = false;

  availableTags: RatingTag[] = [
    { value: 'ponctuel', label: 'Ponctuel' },
    { value: 'professionnel', label: 'Professionnel' },
    { value: 'soigneux', label: 'Soigneux' },
    { value: 'rapide', label: 'Rapide' },
    { value: 'communicatif', label: 'Communicatif' },
    { value: 'courtois', label: 'Courtois' }
  ];

  private readonly ratingLabels: Record<number, string> = {
    1: 'Très mauvais',
    2: 'Mauvais',
    3: 'Bien',
    4: 'Très bien',
    5: 'Excellent'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private missionService: MissionService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.missionId = this.route.snapshot.paramMap.get('missionId') || '';
    this.loadMission();
  }

  loadMission(): void {
    this.loading = true;

    this.missionService.getMissionById(this.missionId).subscribe({
      next: (mission) => {
        this.mission = mission;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  setRating(stars: number): void {
    this.rating = stars;
  }

  getRatingText(): string {
    return this.ratingLabels[this.rating] ?? '';
  }

  toggleTag(tag: string): void {
    const index = this.selectedTags.indexOf(tag);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
      return;
    }

    this.selectedTags.push(tag);
  }

  isTagSelected(tag: string): boolean {
    return this.selectedTags.includes(tag);
  }

  submitRating(): void {
    if (this.rating === 0) {
      this.toastService.warning('Veuillez sélectionner une note');
      return;
    }

    this.submitting = true;

    setTimeout(() => {
      this.submitting = false;
      this.submitted = true;
      this.toastService.success('Merci pour votre évaluation !');
    }, 900);
  }

  skipRating(): void {
    this.router.navigate(['/client/history']);
  }

  goHome(): void {
    this.router.navigate(['/client/dashboard']);
  }

  getDriverName(): string {
    return this.formatUserName(this.mission?.livreur) || 'Ahmed Benali';
  }

  getDriverInitials(): string {
    return this.buildInitials(this.getDriverName());
  }

  getMissionTypeLabel(): string {
    return this.mission?.typeVehiculeRequis || 'Camionnette';
  }

  getMissionReference(): string {
    return this.mission?.id ? `Mission #${this.mission.id}` : 'Mission';
  }

  getPickupLabel(): string {
    return this.formatLocationLabel(this.mission?.depart?.ville, this.mission?.depart?.rue, this.mission?.adresseRamassage);
  }

  getDeliveryLabel(): string {
    return this.formatLocationLabel(this.mission?.destination?.ville, this.mission?.destination?.rue, this.mission?.adresseLivraison);
  }

  getDeliveryDateLabel(): string {
    const rawDate = this.mission?.dateLivraison ?? this.mission?.dateDemandee;
    if (!rawDate) {
      return '';
    }

    const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  }

  private formatUserName(user: User | null | undefined): string {
    if (!user) {
      return '';
    }

    return `${user.prenom ?? ''} ${user.nom ?? ''}`.trim();
  }

  private buildInitials(name: string): string {
    const parts = name.split(' ').filter(Boolean);

    if (!parts.length) {
      return 'AB';
    }

    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  private formatLocationLabel(city?: string | null, street?: string | null, fallback?: string | null): string {
    const normalizedCity = (city ?? '').trim();
    if (normalizedCity) {
      return normalizedCity;
    }

    const normalizedStreet = (street ?? '').trim();
    if (normalizedStreet) {
      return normalizedStreet;
    }

    return (fallback ?? '').trim();
  }
}
