import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <div class="confirm-dialog">
      <h2 mat-dialog-title>{{ data.title }}</h2>
      <div mat-dialog-content>
        <p>{{ data.message }}</p>
      </div>
      <div mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">{{ data.cancelText || 'Annuler' }}</button>
        <button mat-raised-button color="warn" (click)="onConfirm()">{{ data.confirmText || 'Confirmer' }}</button>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      padding: 20px;
      background: var(--surface);
      color: var(--text-1);
    }
    h2 {
      margin: 0 0 16px 0;
      font-size: 20px;
      font-weight: 600;
      color: var(--text-1);
    }
    p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
      color: var(--text-2);
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
