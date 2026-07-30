import { Component } from '@angular/core';

@Component({
  selector: 'app-livreur-layout',
  templateUrl: './livreur-layout.component.html',
  styleUrls: ['./livreur-layout.component.css']
})
export class LivreurLayoutComponent {
  collapsed = false;

  closeMobileSidebar(): void {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('sidebar-open');
    }
  }
}
