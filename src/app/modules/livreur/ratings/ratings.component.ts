import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RatingService, RatingResponse, RatingSummaryResponse } from '../../../core/services/rating.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-livreur-ratings',
  templateUrl: './ratings.component.html',
  styleUrls: ['./ratings.component.css']
})
export class RatingsComponent implements OnInit {
  ratings: RatingResponse[] = [];
  loading = true;
  averageRating = 0;
  totalRatings = 0;

  constructor(
    private ratingService: RatingService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRatings();
  }

  private loadRatings(): void {
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      this.router.navigate(['/livreur/dashboard']);
      return;
    }

    this.ratingService.getRatingSummary(user.id).subscribe({
      next: (summary: RatingSummaryResponse) => {
        this.ratings = summary.reviews ?? summary.ratings ?? [];
        const average = summary.average ?? summary.noteMoyenne ?? summary.note ?? 0;
        this.averageRating = average;
        this.totalRatings = summary.totalCount ?? summary.count ?? summary.totalNotes ?? this.ratings.length;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading rating summary:', err);
        this.loading = false;
      }
    });
  }

  private calculateStats(ratings: RatingResponse[]): void {
    if (ratings.length === 0) {
      this.averageRating = 0;
      this.totalRatings = 0;
      return;
    }

    const sum = ratings.reduce((acc, r) => acc + (r.etoiles || 0), 0);
    this.averageRating = sum / ratings.length;
    this.totalRatings = ratings.length;
  }

  goBack(): void {
    this.router.navigate(['/livreur/dashboard']);
  }

  getRatingStars(): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  isRatingFilled(star: number): boolean {
    return star <= Math.floor(this.averageRating);
  }

  isRatingHalf(star: number): boolean {
    return star === Math.ceil(this.averageRating) && this.averageRating % 1 !== 0;
  }

  getRatingStarsForReview(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  isReviewRatingFilled(rating: number, star: number): boolean {
    return star <= Math.floor(rating);
  }

  isReviewRatingHalf(rating: number, star: number): boolean {
    return star === Math.ceil(rating) && rating % 1 !== 0;
  }

  getDistributionCount(stars: number): number {
    return this.ratings.filter(r => r.etoiles === stars).length;
  }

  getDistributionPercentage(stars: number): number {
    if (this.totalRatings === 0) return 0;
    return (this.getDistributionCount(stars) / this.totalRatings) * 100;
  }
}
