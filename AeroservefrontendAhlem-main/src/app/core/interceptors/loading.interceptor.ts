import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);

  const isBackgroundUrl = req.url.includes('chatbot') || req.url.includes('notifications');

  if (isBackgroundUrl) {
    return next(req);
  }

  loading.start();
  return next(req).pipe(finalize(() => loading.stop()));
};
