import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();
    
    console.log(`🔒 Intercepteur HTTP - URL: ${request.url}`);
    console.log(`🔑 Token disponible: ${!!token}`);
    
    let authReq = request;
    
    if (token) {
      authReq = request.clone({
        headers: request.headers.set('Authorization', `Bearer ${token}`)
      });
      console.log('✅ Token ajouté à la requête');
    }
    
    return next.handle(authReq).pipe(
      tap(event => {
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Erreur interceptée par AuthInterceptor:', error);
        
        if (error.status === 401) {
          console.warn('⚠️ Erreur d\'authentification 401 détectée');
        }
        
        return throwError(() => error);
      })
    );
  }
} 