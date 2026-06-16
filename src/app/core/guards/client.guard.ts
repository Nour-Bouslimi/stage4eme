import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class ClientGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const role = this.authService.getRole();

    if (role === UserRole.CLIENT) {
      return true;
    }

    if (role === UserRole.LIVREUR) {
      this.router.navigate(['/livreur/dashboard']);
      return false;
    }

    if (role === UserRole.ADMIN) {
      this.router.navigate(['/admin/dashboard']);
      return false;
    }

    this.router.navigate(['/auth/login']);
    return false;
  }
}
