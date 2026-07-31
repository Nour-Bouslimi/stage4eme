import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MissionRatingStateService {
  private readonly storageKey = 'rated-mission-ids';

  isMissionRated(missionId: string): boolean {
    if (!missionId) {
      return false;
    }

    return this.readIds().has(missionId);
  }

  markMissionRated(missionId: string): void {
    if (!missionId) {
      return;
    }

    const ids = this.readIds();
    ids.add(missionId);
    this.writeIds(ids);
  }

  clearMissionRating(missionId: string): void {
    if (!missionId) {
      return;
    }

    const ids = this.readIds();
    ids.delete(missionId);
    this.writeIds(ids);
  }

  private readIds(): Set<string> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return new Set<string>();
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return new Set<string>();
      }

      return new Set(parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0));
    } catch {
      return new Set<string>();
    }
  }

  private writeIds(ids: Set<string>): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(Array.from(ids)));
    } catch {
      // Ignore storage write failures.
    }
  }
}
