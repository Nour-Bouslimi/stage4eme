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

import { LivreurLayoutComponent } from './livreur-layout/livreur-layout.component';
import { LivreurDashboardComponent } from './dashboard/livreur-dashboard.component';
import { LivreurMissionsComponent } from './missions/livreur-missions.component';
import { ActiveMissionComponent } from './active-mission/active-mission.component';
import { LivreurChatComponent } from './chat/livreur-chat.component';
import { LivreurProfilComponent } from './profil/livreur-profil.component';
import { RatingsComponent } from './ratings/ratings.component';

const routes: Routes = [
  {
    path: '',
    component: LivreurLayoutComponent,
    children: [
      { path: 'dashboard', component: LivreurDashboardComponent },
      { path: 'missions', component: LivreurMissionsComponent },
      { path: 'active/:missionId', component: ActiveMissionComponent },
      { path: 'chat', component: LivreurChatComponent },
      { path: 'chat/:missionId', component: LivreurChatComponent },
      { path: 'profil', component: LivreurProfilComponent },
      { path: 'ratings', component: RatingsComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  declarations: [
    LivreurLayoutComponent,
    LivreurDashboardComponent,
    LivreurMissionsComponent,
    ActiveMissionComponent,
    LivreurChatComponent,
    LivreurProfilComponent,
    RatingsComponent
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
export class LivreurModule { }
