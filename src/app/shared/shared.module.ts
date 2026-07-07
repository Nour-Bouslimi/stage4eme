import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ToastComponent } from './components/toast/toast.component';
import { MapComponent } from './components/map/map.component';
import { StatusBadgeComponent } from './components/status-badge/status-badge.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';

@NgModule({
  declarations: [
    HeaderComponent,
    SidebarComponent,
    ToastComponent,
    MapComponent,
    StatusBadgeComponent,
    ConfirmDialogComponent
  ],
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    RouterModule
  ],
  exports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    RouterModule,
    HeaderComponent,
    SidebarComponent,
    ToastComponent,
    MapComponent,
    StatusBadgeComponent,
    ConfirmDialogComponent
  ]
})
export class SharedModule { }
