import { Component, OnInit } from '@angular/core';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  template: '<app-toast></app-toast><router-outlet></router-outlet>'
})
export class AppComponent implements OnInit {
  title = 'frontendstage';

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themeService.initializeTheme();
  }
}
