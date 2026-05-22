import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LoadingService } from './core/services/loading.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'AeroServeFront';
  protected loadingVisible;

  constructor(public loading: LoadingService) {
    this.loadingVisible = toSignal(this.loading.loading$, { initialValue: false });
  }
}
