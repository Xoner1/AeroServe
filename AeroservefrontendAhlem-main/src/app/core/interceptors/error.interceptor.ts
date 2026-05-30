import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: any) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          if (!router.url.includes('/login')) {
            auth.logout();
            Swal.fire({
              title: 'Session expirée',
              text: 'Veuillez vous reconnecter.',
              icon: 'warning',
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 3000,
              timerProgressBar: true,
            });
          }
        } else if (error.status === 403) {
          Swal.fire({
            title: 'Accès refusé',
            text: "Vous n'avez pas les permissions pour effectuer cette action.",
            icon: 'error',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
          });
        } else if (error.status === 500) {
          Swal.fire({
            title: 'Erreur serveur',
            text: 'Une erreur interne est survenue sur le serveur.',
            icon: 'error',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
          });
        } else if (error.status === 0) {
          Swal.fire({
            title: 'Erreur réseau',
            text: 'Impossible de se connecter au serveur. Vérifiez votre connexion Internet.',
            icon: 'error',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true,
          });
        }
      }
      return throwError(() => error);
    })
  );
};
