import { CanActivateFn } from '@angular/router';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { inject } from '@angular/core'; 
import { AuthService } from './auth.service'; 

@Injectable({
  providedIn: 'root',
})
export class AuthGuardService {
  constructor(private authService: AuthService, private router: Router) {}

  checkAuthentication(): boolean {
    const isAuthenticated = this.authService.isAuthenticated();
    if (!isAuthenticated) {
      this.router.navigate(['/login']); 
    }
    return isAuthenticated;
  }
}


export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService); 
  const router = inject(Router); 
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    router.navigate(['/login']); 
    return false;
  }
  return true;
};
