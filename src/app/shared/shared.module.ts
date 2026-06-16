import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ToastComponent } from './components/toast/toast.component';
import { MapComponent } from './components/map/map.component';
import { StatusBadgeComponent } from './components/status-badge/status-badge.component';

@NgModule({
  declarations: [
    HeaderComponent,
    SidebarComponent,
    ToastComponent,
    MapComponent,
    StatusBadgeComponent
  ],
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    RouterModule
  ],
  exports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    HeaderComponent,
    SidebarComponent,
    ToastComponent,
    MapComponent,
    StatusBadgeComponent
  ]
})
export class SharedModule { }
