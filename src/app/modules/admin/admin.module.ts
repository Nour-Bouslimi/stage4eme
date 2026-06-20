import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SharedModule } from '../../shared/shared.module';

import { AdminLayoutComponent } from './admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminProfileComponent } from './profile/admin-profile.component';
import { ClientsListComponent } from './clients/clients-list.component';
import { LivreursListComponent } from './livreurs/livreurs-list.component';
import { CreateLivreurComponent } from './livreurs/create-livreur/create-livreur.component';
import { AdminMissionsComponent } from './missions/admin-missions.component';

const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'profile', component: AdminProfileComponent },
      { path: 'clients', component: ClientsListComponent },
      { path: 'livreurs', component: LivreursListComponent },
      { path: 'livreurs/create', component: CreateLivreurComponent },
      { path: 'missions', component: AdminMissionsComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  declarations: [
    AdminLayoutComponent,
    AdminDashboardComponent,
    AdminProfileComponent,
    ClientsListComponent,
    LivreursListComponent,
    CreateLivreurComponent,
    AdminMissionsComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ]
})
export class AdminModule { }
