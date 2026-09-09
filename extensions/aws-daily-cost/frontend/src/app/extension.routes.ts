import { Routes } from '@angular/router';
import { ListAwsDailyCostComponent } from './list/list-aws-daily-cost.component';
import { AddAwsDailyCostComponent } from './add/add-aws-daily-cost.component';
import { ViewAwsDailyCostComponent } from './view/view-aws-daily-cost.component';

export const Extension: Routes = [
  { path: '', component: ListAwsDailyCostComponent },
  { path: 'add', component: AddAwsDailyCostComponent },
  { path: 'edit/:id', component: AddAwsDailyCostComponent, data: { action: 'Edit' } },
  { path: 'view/:id', component: ViewAwsDailyCostComponent },
];
