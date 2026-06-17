import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-reset-redirect',
  template: `<p>Redirection en cours…</p>`,
  styles: [ `p { padding: 1rem; font-size: 1rem; }` ]
})
export class ResetRedirectComponent implements OnInit {
  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.router.navigate(['/auth/reset-password'], { queryParams: params });
    });
  }
}
