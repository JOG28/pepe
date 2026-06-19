import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NuevogastoPage } from './nuevogasto.page';

describe('NuevogastoPage', () => {
  let component: NuevogastoPage;
  let fixture: ComponentFixture<NuevogastoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NuevogastoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
