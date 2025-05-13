import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  
  constructor(private authService: AuthService, private router: Router) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.isAdmin().pipe(
      take(1),
      map(isAdmin => {
        if (!isAdmin) {
          console.log('Accès refusé: droits administrateur requis');
          this.router.navigate(['/accueil']);
          return false;
        }
        return true;
      })
    );
  }
} 