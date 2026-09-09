import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonLibComponentsModule, FlatStatusFilter } from '@duplocloud-internal/ng-common-lib';
import { AwsDailyCostService, AwsDailyCost } from '../aws-daily-cost.service';
import { ResultTemplateModule } from '../result-template/result-template.module';
import { StatusBadgeComponent } from '../shared/status-badge.component';

const FALLBACK_VIEW_TEMPLATE: any = {
  resourceType: 'AwsDailyCost',
  subType: 'aws-daily-cost',
  label: 'AWS Daily Cost',
  icon: 'package-variant',
  idField: 'id',
  groups: [
    {
      name: 'Summary',
      fields: [
        { type: 'single', key: 'queryMonth', label: 'Month', value: 'result.queryMonth', hideWhenEmpty: true },
        { type: 'single', key: 'totalCost', label: 'Total Cost', value: 'result.totalCost', hideWhenEmpty: true },
        { type: 'single', key: 'currency', label: 'Currency', value: 'result.currency', hideWhenEmpty: true },
      ],
    },
    {
      name: 'Daily Cost Breakdown',
      fields: [
        {
          type: 'table',
          key: 'costEntries',
          label: 'Daily Entries',
          value: 'result.costEntries',
          hideWhenEmpty: true,
          columns: [
            { key: 'date', label: 'Date' },
            { key: 'group', label: 'Group' },
            { key: 'amount', label: 'Amount' },
            { key: 'unit', label: 'Unit' },
          ],
        },
      ],
    },
  ],
};

@Component({
  selector: 'adc-view',
  imports: [CommonLibComponentsModule, ResultTemplateModule, StatusBadgeComponent, CommonModule, DecimalPipe],
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

        <sidecard featherIcon="dollar-sign">
          <h6 class="card-subtitle text-muted">Total Cost</h6>
          <h4 class="card-title">
            @if (it.result?.totalCost != null) {
              {{ it.result!.totalCost | number:'1.2-4' }} {{ it.result!.currency || 'USD' }}
            } @else {
              —
            }
          </h4>
        </sidecard>

        <sidecard featherIcon="calendar">
          <h6 class="card-subtitle text-muted">Month</h6>
          <h4 class="card-title">{{ it.result?.queryMonth || it.spec?.month || '—' }}</h4>
        </sidecard>

        <section class="card px-2 py-1">
          @switch (activePanel()) {
            @case ('spec') {
              <div class="p-1">
                <div class="row mb-50">
                  <div class="col-md-6"><strong>Month:</strong> {{ it.spec?.month || '—' }}</div>
                  <div class="col-md-6"><strong>Region:</strong> {{ it.spec?.region || 'us-east-1' }}</div>
                </div>
                <div class="row">
                  <div class="col-md-6"><strong>Group By:</strong> {{ it.spec?.groupBy || 'SERVICE' }}</div>
                </div>
              </div>
            }
            @case ('result') {
              <app-resource-template-view [template]="viewTemplate()" [data]="it"></app-resource-template-view>
            }
          }

          <div class="d-flex justify-content-end align-items-center px-1 pb-1 pt-50">
            @if (it.subStatus) {
              <span class="font-small-3 text-muted mr-75 text-truncate" style="max-width:60%"
                    [title]="it.subStatus">{{ it.subStatus }}</span>
            }
          </div>
        </section>
      </view-with-sidecards>
    } @else {
      <div class="text-muted p-2">Loading…</div>
    }
  `,
})
export class ViewAwsDailyCostComponent implements OnInit {
  private readonly svc = inject(AwsDailyCostService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly item = signal<AwsDailyCost | undefined>(undefined);
  protected readonly viewTemplate = signal<any>(null);
  protected readonly activePanel = signal<'spec' | 'result'>('spec');
  protected readonly panelFilters = [
    new FlatStatusFilter({ name: 'spec', label: 'Spec' }),
    new FlatStatusFilter({ name: 'result', label: 'Result' }),
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.svc.get(id).subscribe(i => {
      this.item.set(i);
      if (i?.result?.totalCost != null) {
        this.activePanel.set('result');
      }
    });
    this.svc.getViewTemplate().subscribe(t => this.viewTemplate.set(t || FALLBACK_VIEW_TEMPLATE));
  }

  protected edit(): void {
    const it = this.item();
    if (it) {
      this.router.navigate(['../..', 'edit', it.id], { relativeTo: this.route });
    }
  }
}
