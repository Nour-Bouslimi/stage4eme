import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css']
})
export class AdminLayoutComponent {
  collapsed = false;

  closeMobileSidebar(): void {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('sidebar-open');
    }
  }
}
