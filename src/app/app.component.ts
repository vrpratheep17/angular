import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { JarvisGraphComponent } from './jarvis-graph/jarvis-graph.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, JarvisGraphComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'jarvis-angular';
}
