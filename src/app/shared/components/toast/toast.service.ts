import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
  id?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<Toast>();
  public toast$ = this.toastSubject.asObservable();

  success(message: string, duration = 4000): void {
    this.show({ type: 'success', message, duration });
  }

  error(message: string, duration = 4000): void {
    this.show({ type: 'error', message, duration });
  }

  warning(message: string, duration = 4000): void {
    this.show({ type: 'warning', message, duration });
  }

  info(message: string, duration = 4000): void {
    this.show({ type: 'info', message, duration });
  }

  private show(toast: Toast): void {
    const id = Date.now().toString();
    this.toastSubject.next({ ...toast, id });
  }
}
