import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private utilisateurSubject = new BehaviorSubject<any>(null);
  public utilisateur$ = this.utilisateurSubject.asObservable();
  private rolesSubject = new BehaviorSubject<string[]>([]);
  public roles$ = this.rolesSubject.asObservable();
  private isAdminSubject = new BehaviorSubject<boolean>(false);
  public isAdmin$ = this.isAdminSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.chargerUtilisateur();
  }

  private chargerUtilisateur(): void {
    const userData = localStorage.getItem('utilisateur');
    if (userData) {
      const user = JSON.parse(userData);
      this.utilisateurSubject.next(user);
      
      const rolesData = localStorage.getItem('roles');
      if (rolesData) {
        const roles = JSON.parse(rolesData);
        this.rolesSubject.next(roles);
        this.isAdminSubject.next(roles.includes('Administrateur'));
      } else {
        this.chargerRolesUtilisateur();
      }
    }
  }

  public chargerRolesUtilisateur(userId?: number): void {
    const id = userId || this.getCurrentUserId();
    
    if (!id) {
      console.error('❌ Impossible de charger les rôles: aucun ID utilisateur disponible');
      return;
    }
    
    this.http.get<any>(`${this.apiUrl}/users/roles?userId=${id}`).subscribe(
      (response) => {
        if (response && response.roles) {
          const roles = response.roles.split(',').map((role: string) => role.trim());
          this.rolesSubject.next(roles);
          this.isAdminSubject.next(roles.includes('Administrateur'));
          localStorage.setItem('roles', JSON.stringify(roles));
        }
      },
      (error) => {
        console.error('Erreur lors du chargement des rôles:', error);
      }
    );
  }

  login(email: string, motDePasse: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/login`, { email, motDePasse }).pipe(
      tap(response => {
        console.log('Réponse complète de connexion:', response);
        if (response && response.utilisateur) {
          if (response.token) {
            localStorage.setItem('token', response.token);
            console.log('✅ Token JWT sauvegardé');
          }

          const id_utilisateur = response.utilisateur.id_utilisateur || response.utilisateur.id;
          
          if (!id_utilisateur) {
            console.error('⚠️ ID utilisateur manquant dans la réponse');
            return;
          }

          const utilisateur = {
            ...response.utilisateur,
            id: id_utilisateur,  
            id_utilisateur: id_utilisateur  
          };

          console.log('Données utilisateur à sauvegarder:', utilisateur);

          this.utilisateurSubject.next(utilisateur);
          localStorage.setItem('utilisateur', JSON.stringify(utilisateur));
          localStorage.setItem('userEmail', utilisateur.email); 
          localStorage.setItem('userId', id_utilisateur.toString()); 
          
          console.log('Données stockées dans localStorage:', {
            utilisateur: localStorage.getItem('utilisateur'),
            email: localStorage.getItem('userEmail'),
            token: localStorage.getItem('token'),
            userId: localStorage.getItem('userId')
          });
          
          if (response.roles) {
            const roles = response.roles.split(',').map((role: string) => role.trim());
            this.rolesSubject.next(roles);
            this.isAdminSubject.next(response.isAdmin === true);
            localStorage.setItem('roles', JSON.stringify(roles));
          }
          
          console.log('🔄 Programmation de la redirection vers l\'accueil...');
          
          this.router.navigate(['/accueil']);
          
          setTimeout(() => {
            console.log('🔄 Redirection avec délai vers l\'accueil...');
            this.router.navigate(['/accueil'], { replaceUrl: true });
          }, 500);
        }
      }),
      catchError(error => {
        console.error('Erreur de connexion:', error);
        return of({ success: false, message: error.error?.message || 'Une erreur est survenue lors de la connexion' });
      })
    );
  }

  logout(): void {
    localStorage.removeItem('utilisateur');
    localStorage.removeItem('roles');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('token'); 
    localStorage.removeItem('userId');
    
    this.utilisateurSubject.next(null);
    this.rolesSubject.next([]);
    this.isAdminSubject.next(false);
    
    console.log('Déconnexion effectuée, localStorage nettoyé');
    
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.utilisateurSubject.value || !!localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return this.isLoggedIn();
  }

  getCurrentUserId(): string | null {
    return localStorage.getItem('userId');
  }

  hasRole(role: string): Observable<boolean> {
    return this.roles$.pipe(
      map(roles => roles.includes(role))
    );
  }

  isAdmin(): Observable<boolean> {
    return this.isAdmin$;
  }

  isGerant(): Observable<boolean> {
    return this.hasRole('Gérant');
  }

  getToken(): string | null {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ Pas de token JWT trouvé dans le localStorage');
      return null;
    }
    return token;
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; 
      const now = Date.now();
      return now >= expirationTime;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification de l\'expiration du token:', error);
      return true;
    }
  }

  handleAuthError(error: HttpErrorResponse): Observable<any> {
    if (error.status === 401) {
      if (error.error?.error === 'TOKEN_EXPIRED') {
        console.warn('⚠️ Token expiré, déconnexion automatique...');
        this.logout();
        this.router.navigate(['/login'], { queryParams: { expired: 'true' } });
        return throwError(() => new Error('Session expirée, veuillez vous reconnecter'));
      }
    }
    return throwError(() => error);
  }

  updateUserProfile(userData: any): Observable<any> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return throwError(() => new Error('Utilisateur non connecté'));
    }

    const formData = new FormData();
    
    Object.keys(userData).forEach(key => {
      formData.append(key, userData[key]);
    });
    
    return this.http.put<any>(`${this.apiUrl}/users/${userId}/profile`, formData).pipe(
      tap(response => {
        console.log('Profil mis à jour:', response);
        
        if (response && response.user) {
          const currentUser = this.utilisateurSubject.getValue();
          const updatedUser = { ...currentUser, ...response.user };
          
          this.utilisateurSubject.next(updatedUser);
          localStorage.setItem('utilisateur', JSON.stringify(updatedUser));
          
          if (response.user.email) {
            localStorage.setItem('userEmail', response.user.email);
          }
        }
      }),
      catchError(this.handleAuthError)
    );
  }
}
