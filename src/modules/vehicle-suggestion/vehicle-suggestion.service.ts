import { Injectable, Logger } from '@nestjs/common';
import Groq from 'groq-sdk';
import { TypeVehicule } from '../../common/enums/type-vehicule.enum';

export interface VehicleSuggestion {
  typeVehicule: TypeVehicule;
  poidsMinKg: number;
  volumeMinM3: number;
  raison: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

@Injectable()
export class VehicleSuggestionService {
  private readonly logger = new Logger(VehicleSuggestionService.name);
  private groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  async suggestVehicle(description: string): Promise<VehicleSuggestion> {
    /* const prompt = `Tu es un assistant logistique tunisien. Analyse ce besoin et retourne UNIQUEMENT un JSON valide, aucun texte autour.

Besoin : "${description}"

Règles de sélection (choisis EXACTEMENT une de ces valeurs) :
- BICYCLETTE  : documents, très petits colis < 5kg,   < 0.02m³
- SCOOTER     : colis légers < 20kg,  < 0.08m³  (courses, repas, pharmacie)
- MOTO        : colis < 40kg,         < 0.15m³  (petits achats, colis moyens)
- VOITURE     : objets < 100kg,       < 0.8m³   (petit électroménager, cartons)
- PICKUP      : objets < 300kg,       < 2m³     (matériaux légers, plusieurs cartons)
- FOURGONNETTE: objets < 600kg,       < 8m³     (meubles, déménagement partiel)
- PETIT_CAMION: objets < 2000kg,      < 20m³    (déménagement complet, gros meubles)
- GROS_CAMION : objets > 2000kg ou   > 20m³    (chantier, déménagement industriel)

Format JSON attendu (respecte exactement les noms des clés) :
{
  "typeVehicule": "BICYCLETTE|SCOOTER|MOTO|VOITURE|PICKUP|FOURGONNETTE|PETIT_CAMION|GROS_CAMION",
  "poidsMinKg": number,
  "volumeMinM3": number,
  "raison": "courte explication en français",
  "confidence": "HIGH|MEDIUM|LOW"
}`; */

const prompt = `Tu es un assistant logistique tunisien. Analyse ce besoin et retourne UNIQUEMENT un JSON valide, aucun texte autour.

Besoin : "${description}"

Règles de sélection (choisis EXACTEMENT une de ces valeurs) :
- BICYCLETTE  : documents, très petits colis < 5kg,   volume < 0.02m³
- SCOOTER     : colis légers < 20kg,  volume < 0.08m³
- MOTO        : colis < 40kg,         volume < 0.15m³
- VOITURE     : objets < 100kg,       volume < 0.8m³
- PICKUP      : objets < 300kg,       volume < 2m³
- FOURGONNETTE: objets < 600kg,       volume < 8m³
- PETIT_CAMION: objets < 2000kg,      volume < 20m³
- GROS_CAMION : objets > 2000kg ou   volume > 20m³

IMPORTANT : poidsMinKg et volumeMinM3 doivent être des nombres STRICTEMENT SUPÉRIEURS À ZÉRO.
Utilise les valeurs typiques pour le type de véhicule choisi.

Exemples de valeurs attendues :
- FOURGONNETTE → poidsMinKg: 150, volumeMinM3: 3.5
- VOITURE      → poidsMinKg: 30,  volumeMinM3: 0.4
- MOTO         → poidsMinKg: 5,   volumeMinM3: 0.05
- PETIT_CAMION → poidsMinKg: 500, volumeMinM3: 10.0

Format JSON attendu :
{
  "typeVehicule": "BICYCLETTE|SCOOTER|MOTO|VOITURE|PICKUP|FOURGONNETTE|PETIT_CAMION|GROS_CAMION",
  "poidsMinKg": <nombre entier > 0>,
  "volumeMinM3": <nombre décimal > 0>,
  "raison": "courte explication en français",
  "confidence": "HIGH|MEDIUM|LOW"
}`;

    try {
      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error('Réponse IA vide');
      }

      const jsonMatch = content.trim().match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Réponse non JSON');

      const result = JSON.parse(jsonMatch[0]);

     // Après JSON.parse(jsonMatch[0])
const DEFAULTS: Record<string, { poids: number; volume: number }> = {
  BICYCLETTE  : { poids: 2,    volume: 0.02 },
  SCOOTER     : { poids: 10,   volume: 0.05 },
  MOTO        : { poids: 20,   volume: 0.10 },
  VOITURE     : { poids: 50,   volume: 0.40 },
  PICKUP      : { poids: 150,  volume: 1.50 },
  FOURGONNETTE: { poids: 150,  volume: 3.50 },
  PETIT_CAMION: { poids: 500,  volume: 10.0 },
  GROS_CAMION : { poids: 2000, volume: 20.0 },
};

const defaults = DEFAULTS[result.typeVehicule] ?? DEFAULTS['VOITURE'];

// Corriger les valeurs nulles ou zéro
if (!result.poidsMinKg || result.poidsMinKg <= 0) {
  result.poidsMinKg = defaults.poids;
}
if (!result.volumeMinM3 || result.volumeMinM3 <= 0) {
  result.volumeMinM3 = defaults.volume;
} 

      // Valider que le typeVehicule retourné est bien dans l'enum
      const validTypes = Object.values(TypeVehicule);
      if (!validTypes.includes(result.typeVehicule)) {
        this.logger.warn(`Type invalide reçu: ${result.typeVehicule} → fallback VOITURE`);
        result.typeVehicule = TypeVehicule.VOITURE;
      }

      this.logger.log(`Suggestion: ${result.typeVehicule} pour "${description}"`);
      return result as VehicleSuggestion;

    } catch (error) {
      this.logger.error(`Erreur suggestion véhicule: ${error.message}`);
      return {
        typeVehicule: TypeVehicule.VOITURE,
        poidsMinKg: 50,
        volumeMinM3: 0.5,
        raison: 'Suggestion par défaut (service IA indisponible)',
        confidence: 'LOW',
      };
    }
  }
}