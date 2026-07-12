// src/app/core/models/driver-recommendation.model.ts
export interface DriverRecommendation {
  rank: number;
  id: string;
  prenom: string;
  nom: string;
  photo: string | null;
  typeVehicule: string;
  noteMoyenne: number;
  totalMissions: number;
  estEnLigne: boolean;
  telephone: string;
  latitudeActuelle: number;
  longitudeActuelle: number;
  score: number;
  distanceKm: number;
  scoreDetails: {
    noteScore: number;
    acceptanceScore: number;
    similarityScore: number;
    proximityScore: number;
    availabilityScore: number;
  };
}
