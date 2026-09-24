import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonLibComponentsModule, FlatStatusFilter } from '@duplocloud-internal/ng-common-lib';
import { AwsResourceListService, AwsResourceList } from '../aws-resource-list.service';
import { ResultTemplateModule } from '../result-template/result-template.module';
import { StatusBadgeComponent } from '../shared/status-badge.component';

const AWS_RESOURCE_LIST_VIEW_TEMPLATE: any = {
  resourceType: 'AwsResourceList', subType: 'aws-resource-list', label: 'EC2 Instances', icon: 'server', idField: 'id',
  groups: [{
    name: 'EC2 Instances',
    fields: [
      { type: 'table', key: 'instances', label: 'Instances', value: 'result.instances',
        columns: [
          { key: 'instanceId', label: 'Instance ID' },
          { key: 'instanceType', label: 'Type' },
          { key: 'state', label: 'State' },
          { key: 'name', label: 'Name' },
          { key: 'publicIpAddress', label: 'Public IP' },
        ],
      },
    ],
  }],
};

@Component({
  selector: 'arl-view',
  imports: [CommonLibComponentsModule, ResultTemplateModule, StatusBadgeComponent],
  template: `
    @if (item(); as it) {
      <view-with-sidecards>
        <view-header-card [compactActions]="true">
          <ng-template #title>
            <h3 class="text-uppercase mr-auto">
              <span class="badge avatar-badge">{{ it.name?.[0] }}</span>
              <span class="name-badge">{{ it.name }}</span>
            </h3>
          </ng-template>

          <ng-template #actions>
            <a ngbDropdownItem (click)="edit()"><i data-feather="edit"></i> Edit</a>
            <a ngbDropdownItem (click)="track()"><i data-feather="terminal"></i> View Provisioning Ticket</a>
          </ng-template>

          <ng-template #headerFilter>
            <app-flat-status-filter
              [filters]="panelFilters"
              [activeStatus]="activePanel()"
              [showCount]="false"
              (changed)="activePanel.set($event)">
            </app-flat-status-filter>
          </ng-template>
        </view-header-card>

        <sidecard featherIcon="activity">
          <h6 class="card-subtitle text-muted">Status</h6>
          <h4 class="card-title"><app-status-badge [status]="it.status"></app-status-badge></h4>
        </sidecard>
        <sidecard featherIcon="map-pin">
          <h6 class="card-subtitle text-muted">Region</h6>
          <h4 class="card-title">{{ it.spec?.region || '—' }}</h4>
        </sidecard>
        <sidecard featherIcon="server">
          <h6 class="card-subtitle text-muted">Instances</h6>
          <h4 class="card-title">{{ it.result?.instances?.length ?? 0 }}</h4>
        </sidecard>

        <section class="card px-2 py-1">
          @switch (activePanel()) {
            @case ('spec') {
              <div class="p-1">
                <div class="row">
                  <div class="col-md-6"><strong>Name:</strong> {{ it.name }}</div>
                  <div class="col-md-6"><strong>Region:</strong> {{ it.spec?.region || '—' }}</div>
                </div>
              </div>
            }
            @case ('result') {
              @if ((it.result?.instances?.length ?? 0) > 0) {
                <app-resource-template-view [template]="viewTemplate()" [data]="it"></app-resource-template-view>
              } @else {
                <div class="p-2 text-muted">No EC2 instances found in {{ it.spec?.region }}.</div>
              }
            }
          }
          <div class="d-flex justify-content-end align-items-center px-1 pb-1 pt-50">
            @if (it.subStatus) {
              <span class="font-small-3 text-muted mr-75 text-truncate" style="max-width:60%"
                    [title]="it.subStatus">{{ it.subStatus }}</span>
            }
            <button class="btn btn-primary btn-sm" (click)="track()" [disabled]="tracking()">
              <i data-feather="zap" class="mr-50"></i> Track Provisioning Status
            </button>
          </div>
        </section>
      </view-with-sidecards>
    } @else {
      <div class="text-muted p-2">Loading…</div>
    }
  `,
})
export class ViewAwsResourceListComponent implements OnInit {
  private readonly svc = inject(AwsResourceListService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly item = signal<AwsResourceList | undefined>(undefined);
  protected readonly viewTemplate = signal<any>(null);
  protected readonly activePanel = signal<'spec' | 'result'>('result');
  protected readonly tracking = signal(false);
  protected readonly panelFilters = [
    new FlatStatusFilter({ name: 'spec', label: 'Spec' }),
    new FlatStatusFilter({ name: 'result', label: 'Result' }),
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.svc.get(id).subscribe(i => this.item.set(i));
    this.svc.getViewTemplate().subscribe(t => this.viewTemplate.set(t || AWS_RESOURCE_LIST_VIEW_TEMPLATE));
  }

  protected edit(): void {
    const it = this.item();
    if (it) this.router.navigate(['../..', 'edit', it.id], { relativeTo: this.route });
  }

  protected track(): void {
    const it = this.item();
    if (!it) return;
    this.tracking.set(true);
    this.svc.ticketName(it.id).subscribe({
      next: name => {
        this.tracking.set(false);
        if (!name) return;
        this.router.navigate(['/ai/service-desk', this.svc.workspaceId(), 'tickets', 'chat', name]);
      },
      error: () => this.tracking.set(false),
    });
  }
}
