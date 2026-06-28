import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User, normalizeUser } from '../models/user.model';

export interface UpdateLocationRequest {
  latitude?: number;
  longitude?: number;
  estEnLigne?: boolean;
}

export interface CreateLivreurPayload {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  motDePasse: string;
  cin?: string;
  typeVehicule: string;
  immatriculationVehicule: string;
  poidsMaxKg?: number;
  volumeMaxM3?: number;
  rayonServiceKm?: number;
  photoCinFile?: File;
  photoVehiculeFile?: File;
}

interface CreateLivreurResponse {
  user?: User;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/me`).pipe(
      map(user => normalizeUser(user))
    );
  }

  updateProfile(data: Partial<User> | FormData): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/me`, data).pipe(
      map(user => normalizeUser(user))
    );
  }

  updateDisponibilite(disponible: boolean): Observable<User> {
    return this.updateLocation(undefined, undefined, disponible);
  }

  updateLocation(latitude?: number, longitude?: number, estEnLigne?: boolean): Observable<User> {
    const payload: UpdateLocationRequest = {};

    if (typeof latitude === 'number') {
      payload.latitude = latitude;
    }

    if (typeof longitude === 'number') {
      payload.longitude = longitude;
    }

    if (typeof estEnLigne === 'boolean') {
      payload.estEnLigne = estEnLigne;
    }

    return this.http.patch<User>(`${this.apiUrl}/users/location`, payload).pipe(
      map(user => normalizeUser(user))
    );
  }

  getLivreursDisponibles(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users/livreurs-disponibles`).pipe(
      map(users => users.map(user => normalizeUser(user)))
    );
  }

  uploadAvatar(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ url: string }>(`${this.apiUrl}/users/upload-avatar`, formData);
  }

  createLivreur(data: CreateLivreurPayload | FormData): Observable<User> {
    const body = this.shouldUseFormData(data) ? this.buildCreateLivreurFormData(data as CreateLivreurPayload) : this.buildCreateLivreurJsonBody(data as CreateLivreurPayload);

    return this.http.post<CreateLivreurResponse | User>(`${this.apiUrl}/users/create-livreur`, body).pipe(
      map(response => normalizeUser(this.extractCreateLivreurUser(response)))
    );
  }

  getClients(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/admin/clients`).pipe(
      map(users => users.map(user => normalizeUser(user)))
    );
  }

  getLivreurs(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/admin/livreurs`).pipe(
      map(users => users.map(user => normalizeUser(user)))
    );
  }

  getLivreurById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/admin/livreurs/${id}`).pipe(
      map(user => normalizeUser(user))
    );
  }

  desactiverUser(id: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/admin/users/${id}/desactiver`, {}).pipe(
      map(user => normalizeUser(user))
    );
  }

  supprimerUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/users/${id}`);
  }

  private buildCreateLivreurFormData(data: CreateLivreurPayload): FormData {
    const formData = new FormData();
    formData.append('prenom', data.prenom);
    formData.append('nom', data.nom);
    formData.append('email', data.email);
    formData.append('telephone', data.telephone);
    formData.append('motDePasse', data.motDePasse);
    formData.append('typeVehicule', data.typeVehicule);
    formData.append('immatriculationVehicule', data.immatriculationVehicule);

    if (data.cin) {
      formData.append('cin', data.cin);
    }

    if (typeof data.poidsMaxKg === 'number') {
      formData.append('poidsMaxKg', String(data.poidsMaxKg));
    }

    if (typeof data.volumeMaxM3 === 'number') {
      formData.append('volumeMaxM3', String(data.volumeMaxM3));
    }

    if (typeof data.rayonServiceKm === 'number') {
      formData.append('rayonServiceKm', String(data.rayonServiceKm));
    }

    if (data.photoCinFile) {
      formData.append('photoCin', data.photoCinFile);
    }

    if (data.photoVehiculeFile) {
      formData.append('photoVehicule', data.photoVehiculeFile);
    }

    return formData;
  }

  private buildCreateLivreurJsonBody(data: CreateLivreurPayload): Record<string, unknown> {
    const body: Record<string, unknown> = {
      prenom: data.prenom,
      nom: data.nom,
      email: data.email,
      telephone: data.telephone,
      motDePasse: data.motDePasse,
      cin: data.cin,
      typeVehicule: data.typeVehicule,
      immatriculationVehicule: data.immatriculationVehicule,
      poidsMaxKg: data.poidsMaxKg,
      volumeMaxM3: data.volumeMaxM3,
      rayonServiceKm: data.rayonServiceKm
    };

    return Object.fromEntries(
      Object.entries(body).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
  }

  private shouldUseFormData(data: CreateLivreurPayload | FormData): boolean {
    if (data instanceof FormData) {
      return true;
    }

    return !!data.photoCinFile || !!data.photoVehiculeFile;
  }

  private extractCreateLivreurUser(response: CreateLivreurResponse | User): Partial<User> {
    if ('user' in response && response.user) {
      return response.user;
    }

    return response as Partial<User>;
  }
}
