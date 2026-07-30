import { Component } from '@angular/core';

@Component({
  selector: 'app-client-layout',
  templateUrl: './client-layout.component.html',
  styleUrls: ['./client-layout.component.css']
})
export class ClientLayoutComponent {
  collapsed = false;

  closeMobileSidebar(): void {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('sidebar-open');
    }
  }
}
