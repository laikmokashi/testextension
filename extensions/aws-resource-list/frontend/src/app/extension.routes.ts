import { Routes } from '@angular/router';
import { ListAwsResourceListComponent } from './list/list-aws-resource-list.component';
import { AddAwsResourceListComponent } from './add/add-aws-resource-list.component';
import { ViewAwsResourceListComponent } from './view/view-aws-resource-list.component';

export const Extension: Routes = [
  { path: '', component: ListAwsResourceListComponent },
  { path: 'add', component: AddAwsResourceListComponent },
  { path: 'edit/:id', component: AddAwsResourceListComponent, data: { action: 'Edit' } },
  { path: 'view/:id', component: ViewAwsResourceListComponent },
];
