import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JarvisGraphComponent } from './jarvis-graph.component';

describe('JarvisGraphComponent', () => {
  let component: JarvisGraphComponent;
  let fixture: ComponentFixture<JarvisGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JarvisGraphComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JarvisGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
