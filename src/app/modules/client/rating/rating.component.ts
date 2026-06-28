import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Mission } from '../../../core/models/mission.model';
import { MissionService } from '../../../core/services/mission.service';
import { RatingService } from '../../../core/services/rating.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { User } from '../../../core/models/user.model';

export enum Appreciation {
  PONCTUEL = 'ponctuel',
  PROFESSIONNEL = 'professionnel',
  SOIGNEUX = 'soigneux',
  RAPIDE = 'rapide',
  COMMUNICATIF = 'communicatif',
  COURTOIS = 'courtois',
  RETARD = 'retard',
  IMPOLI = 'impoli',
  MAUVAIS_SERVICE = 'mauvais_service',
  NON_PROFESSIONNEL = 'non_professionnel'
}

type RatingTag = {
  value: Appreciation;
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
  ratingId: string | null = null;
  loading = true;
  submitting = false;
  submitted = false;

  availableTags: RatingTag[] = [
    { value: Appreciation.PONCTUEL, label: 'Ponctuel' },
    { value: Appreciation.PROFESSIONNEL, label: 'Professionnel' },
    { value: Appreciation.SOIGNEUX, label: 'Soigneux' },
    { value: Appreciation.RAPIDE, label: 'Rapide' },
    { value: Appreciation.COMMUNICATIF, label: 'Communicatif' },
    { value: Appreciation.COURTOIS, label: 'Courtois' },
    { value: Appreciation.RETARD, label: 'Retard' },
    { value: Appreciation.IMPOLI, label: 'Impoli' },
    { value: Appreciation.MAUVAIS_SERVICE, label: 'Mauvais service' },
    { value: Appreciation.NON_PROFESSIONNEL, label: 'Non professionnel' }
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
    private ratingService: RatingService,
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
        this.ratingId = mission.notation?.id ?? null;
        this.rating = mission.notation?.note ?? 0;
        this.selectedTags = Array.isArray(mission.notation?.tags)
          ? mission.notation.tags.map((tag) => String(tag))
          : [];
        this.comment = mission.notation?.commentaire ?? '';
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
    if (!this.isFormComplete()) {
      this.toastService.warning('Veuillez sélectionner une note et au moins un tag');
      return;
    }

    this.submitting = true;

    const appreciationValues = this.selectedTags.length > 0 ? this.selectedTags : undefined;

    const payload = {
      missionId: this.missionId,
      etoiles: this.rating,
      appreciations: appreciationValues,
      tags: appreciationValues,
      commentaire: this.comment?.trim() || undefined
    };

    const request$ = this.ratingId
      ? this.ratingService.updateRating(this.ratingId, {
          etoiles: this.rating,
          appreciations: appreciationValues,
          tags: appreciationValues,
          commentaire: this.comment?.trim() || undefined
        })
      : this.ratingService.createRating(payload);

    // debug: log payload before sending
    // eslint-disable-next-line no-console
    console.debug('[Rating] sending payload', payload);

    request$.subscribe({
      next: () => {
        this.loadMission();
        this.submitted = true;
        this.submitting = false;
        this.toastService.success('Merci pour votre évaluation !');
      },
      error: (err) => {
        this.submitting = false;
        // try to extract a helpful error message from the server
        // eslint-disable-next-line no-console
        console.error('[Rating] submit error', err);
        const serverMessage = err?.error?.message || err?.error?.messageDetail || err?.message || null;
        if (serverMessage) {
          this.toastService.error(String(serverMessage));
        } else {
          this.toastService.error("Impossible d'envoyer votre évaluation pour le moment");
        }
      }
    });
  }

  skipRating(): void {
    this.router.navigate(['/client/history']);
  }

  deleteRating(): void {
    if (!this.ratingId) {
      return;
    }

    this.submitting = true;
    this.ratingService.deleteRating(this.ratingId).subscribe({
      next: () => {
        this.ratingId = null;
        this.rating = 0;
        this.selectedTags = [];
        this.comment = '';
        this.submitted = false;
        this.submitting = false;
        this.toastService.success('Votre avis a été supprimé');
        this.loadMission();
      },
      error: () => {
        this.submitting = false;
        this.toastService.error("Impossible de supprimer votre avis pour le moment");
      }
    });
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
    return 'Mission';
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

  public isFormComplete(): boolean {
    return this.rating > 0 && this.selectedTags.length > 0;
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
