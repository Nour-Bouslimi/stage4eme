import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SharedModule } from '../../shared/shared.module';

import { ClientLayoutComponent } from './client-layout/client-layout.component';
import { ClientDashboardComponent } from './dashboard/client-dashboard.component';
import { CreateMissionComponent } from './create-mission/create-mission.component';
import { DriverSearchComponent } from './driver-search/driver-search.component';
import { TrackingComponent } from './tracking/tracking.component';
import { ClientChatComponent } from './chat/client-chat.component';
import { MissionHistoryComponent } from './history/mission-history.component';
import { RatingComponent } from './rating/rating.component';
import { ClientProfileComponent } from './profile/client-profile.component';

const routes: Routes = [
  {
    path: '',
    component: ClientLayoutComponent,
    children: [
      { path: 'dashboard', component: ClientDashboardComponent },
      { path: 'profile', component: ClientProfileComponent },
      { path: 'create-mission', component: CreateMissionComponent },
      { path: 'driver-search/:missionId', component: DriverSearchComponent },
      { path: 'tracking/:missionId', component: TrackingComponent },
      { path: 'chat', component: ClientChatComponent },
      { path: 'chat/:missionId', component: ClientChatComponent },
      { path: 'history', component: MissionHistoryComponent },
      { path: 'rating/:missionId', component: RatingComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  declarations: [
    ClientLayoutComponent,
    ClientDashboardComponent,
    ClientProfileComponent,
    CreateMissionComponent,
    DriverSearchComponent,
    TrackingComponent,
    ClientChatComponent,
    MissionHistoryComponent,
    RatingComponent
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
    MatChipsModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule
  ]
})
export class ClientModule { }
