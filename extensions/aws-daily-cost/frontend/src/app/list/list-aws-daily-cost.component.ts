import { Component, DestroyRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FilterTableUtils, SearchableDatatableComponent, SearchableDatatableModule } from '@duplocloud-internal/ng-common-lib';
import { AwsDailyCostService, AwsDailyCost, REMOTE_UserSession } from '../aws-daily-cost.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'adc-list',
  imports: [SearchableDatatableModule, StatusBadgeComponent],
  template: `
    <div class="card datatable-card">
      <searchable-datatable
        [showAdd]="true"
        addLabel="Create AWS Daily Cost"
        (add)="add()"
        [rows]="rows()"
        (filter)="filterUpdate()"
        columnMode="force">

        <ngx-datatable-column [width]="50" [sortable]="false" [canAutoResize]="false" cellClass="actions">
          <ng-template ngx-datatable-cell-template let-row="row">
            <div ngbDropdown container="body">
              <button class="btn btn-sm hide-arrow" ngbDropdownToggle>
                <i data-feather="more-vertical"></i>
              </button>
              <div ngbDropdownMenu>
                <a ngbDropdownItem (click)="view(row)">
                  <i data-feather="eye" class="mr-50"></i><span>View</span>
                </a>
                <a ngbDropdownItem (click)="edit(row)">
                  <i data-feather="edit" class="mr-50"></i><span>Edit</span>
                </a>
              </div>
            </div>
          </ng-template>
        </ngx-datatable-column>

        <ngx-datatable-column name="Name" [flexGrow]="160">
          <ng-template ngx-datatable-cell-template let-row="row">
            <a (click)="view(row)" class="text-primary font-weight-medium cursor-pointer">{{ row.name }}</a>
          </ng-template>
        </ngx-datatable-column>

        <ngx-datatable-column name="Month" [flexGrow]="100">
          <ng-template ngx-datatable-cell-template let-row="row">{{ row.spec?.month || '—' }}</ng-template>
        </ngx-datatable-column>

        <ngx-datatable-column name="Group By" [flexGrow]="100">
          <ng-template ngx-datatable-cell-template let-row="row">{{ row.spec?.groupBy || 'SERVICE' }}</ng-template>
        </ngx-datatable-column>

        <ngx-datatable-column name="Total Cost" [flexGrow]="110">
          <ng-template ngx-datatable-cell-template let-row="row">
            @if (row.result?.totalCost != null) {
              {{ row.result.totalCost | number:'1.2-4' }} {{ row.result.currency || 'USD' }}
            } @else {
              —
            }
          </ng-template>
        </ngx-datatable-column>

        <ngx-datatable-column name="Status" [flexGrow]="110" [maxWidth]="150">
          <ng-template ngx-datatable-cell-template let-row="row">
            <app-status-badge [status]="row.status"></app-status-badge>
          </ng-template>
        </ngx-datatable-column>

      </searchable-datatable>
    </div>
  `,
})
export class ListAwsDailyCostComponent implements OnInit {
  private readonly svc = inject(AwsDailyCostService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject<any>(REMOTE_UserSession as any);
  private readonly destroyRef = inject(DestroyRef);
  private readonly table = viewChild(SearchableDatatableComponent);

  private readonly allRows = signal<AwsDailyCost[]>([]);
  private readonly filterTerm = signal('');
  private readonly searchFields = ['name', 'status', 'spec.month', 'spec.groupBy'];

  protected readonly rows = computed(() => {
    const term = this.filterTerm();
    const all = this.allRows();
    return term ? all.filter(r => FilterTableUtils.searchByFields(r, this.searchFields, term)) : all;
  });

  ngOnInit(): void {
    this.session.getTenantRefreshTimer(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([, tenantChanged]: [any, boolean]) => this.refresh(!!tenantChanged));
  }

  private refresh(tenantChanged: boolean): void {
    if (tenantChanged) {
      this.table()?.startLoading();
    }
    this.svc.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: rows => {
        this.allRows.set(rows ?? []);
        this.table()?.refresh();
      },
      error: () => {
        this.allRows.set([]);
        this.table()?.stopLoading();
      },
    });
  }

  protected filterUpdate(): void {
    this.filterTerm.set(this.table()?.searchTerm?.toLowerCase()?.trim() ?? '');
  }

  protected add(): void {
    this.router.navigate(['add'], { relativeTo: this.route });
  }

  protected view(r: AwsDailyCost): void {
    this.router.navigate(['view', r.id], { relativeTo: this.route });
  }

  protected edit(r: AwsDailyCost): void {
    this.router.navigate(['edit', r.id], { relativeTo: this.route });
  }
}
