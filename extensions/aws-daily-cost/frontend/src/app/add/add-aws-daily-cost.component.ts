import { Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormGroupErrorsComponent, SharedFormsModule } from '@duplocloud-internal/ng-common-lib';
import { AwsDailyCostService } from '../aws-daily-cost.service';

@Component({
  selector: 'adc-add',
  imports: [SharedFormsModule],
  styles: [`
    :host { display: block; }
    .panel-form-accordion { background: #fff; padding: 1.25rem 0 1rem 1.5rem; }
    .panel-content-title { width: 265px; min-width: 265px; }
    .panel-content-title-sub-text { max-width: 220px; }
    .panel-content-form { max-width: 768px; flex: 1 1 auto; margin: 0 1rem; padding: 0 1rem; }
    .panel-content-sidenav { width: 265px; min-width: 265px; margin-left: 2rem; }
    .panel-content-sidenav .help-item { padding-bottom: 1rem; }
    .panel-content-sidenav .help-item-title { margin: 0; font-weight: 600; font-size: 0.9rem; }
  `],
  template: `
    <div class="card panel-form-accordion">
      <div class="d-flex justify-content-between">

        <div class="panel-content-title">
          <h4 class="font-weight-bolder">{{ isEdit ? 'Edit' : 'Create' }} AWS Daily Cost</h4>
          <p class="panel-content-title-sub-text text-muted">
            Configure a monthly AWS cost report. The cost data is fetched live from AWS Cost Explorer on each view.
          </p>
        </div>

        <div class="panel-content-form">
          @if (loading()) {
            <div class="text-muted p-1">Loading…</div>
          } @else {
            <form name="AddAwsDailyCostForm" #f="ngForm" class="form form-vertical" (ngSubmit)="f.valid && submit()">
              <div class="form-container" form-group-errors #formGroupErrors showDetailsWhen="submitted">

                <form-field>
                  <label class="element-label">Name *</label>
                  <input type="text" class="form-control" name="name"
                         [ngModel]="name()" (ngModelChange)="name.set($event)"
                         [readonly]="isEdit"
                         placeholder="e.g. sept-2026-costs" required
                         validation-state validation-errors
                         minlength="2" maxlength="60"
                         pattern="^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$" />
                </form-field>

                <form-field>
                  <label class="element-label">Month *</label>
                  <input type="text" class="form-control" name="month"
                         [ngModel]="month()" (ngModelChange)="month.set($event)"
                         placeholder="YYYY-MM (e.g. 2026-09)" required
                         validation-state validation-errors
                         pattern="^[0-9]{4}-(0[1-9]|1[0-2])$" />
                </form-field>

                <form-field>
                  <label class="element-label">AWS Region</label>
                  <select class="form-control" name="region"
                          [ngModel]="region()" (ngModelChange)="region.set($event)">
                    <option value="us-east-1">us-east-1 (N. Virginia)</option>
                    <option value="us-west-2">us-west-2 (Oregon)</option>
                    <option value="eu-west-1">eu-west-1 (Ireland)</option>
                    <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                  </select>
                </form-field>

                <form-field>
                  <label class="element-label">Group By</label>
                  <select class="form-control" name="groupBy"
                          [ngModel]="groupBy()" (ngModelChange)="groupBy.set($event)">
                    <option value="SERVICE">SERVICE</option>
                    <option value="LINKED_ACCOUNT">LINKED_ACCOUNT</option>
                  </select>
                </form-field>

                <div class="d-flex justify-content-end mt-1">
                  <button type="button" class="btn btn-outline-secondary mr-1" (click)="cancel()">Cancel</button>
                  <button type="submit" class="btn btn-primary" [disabled]="saving()">
                    {{ isEdit ? 'Save' : 'Create' }}
                  </button>
                </div>
              </div>
            </form>
          }
        </div>

        <div class="panel-content-sidenav">
          <div class="help-item">
            <p class="help-item-title">Name</p>
            <small class="text-muted">A unique identifier for this cost report.</small>
          </div>
          <div class="help-item">
            <p class="help-item-title">Month</p>
            <small class="text-muted">The month to query in YYYY-MM format. Defaults to current month if left blank.</small>
          </div>
          <div class="help-item">
            <p class="help-item-title">AWS Region</p>
            <small class="text-muted">Cost Explorer is a global service; us-east-1 is recommended.</small>
          </div>
          <div class="help-item">
            <p class="help-item-title">Group By</p>
            <small class="text-muted">Break down daily costs by AWS service or linked account.</small>
          </div>
        </div>

      </div>
    </div>
  `,
})
export class AddAwsDailyCostComponent implements OnInit {
  private readonly svc = inject(AwsDailyCostService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly name = signal('');
  protected readonly month = signal('');
  protected readonly region = signal('us-east-1');
  protected readonly groupBy = signal('SERVICE');
  protected readonly saving = signal(false);
  protected readonly loading = signal(false);

  protected readonly isEdit = this.route.snapshot.data['action'] === 'Edit';
  private readonly id: string = this.route.snapshot.params['id'];
  private readonly formErrors = viewChild(FormGroupErrorsComponent);

  ngOnInit(): void {
    if (!this.isEdit) return;
    this.loading.set(true);
    this.svc.get(this.id).subscribe({
      next: item => {
        this.name.set(item?.name ?? '');
        this.month.set(item?.spec?.month ?? '');
        this.region.set(item?.spec?.region ?? 'us-east-1');
        this.groupBy.set(item?.spec?.groupBy ?? 'SERVICE');
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected submit(): void {
    this.saving.set(true);
    const spec = {
      month: this.month(),
      region: this.region(),
      groupBy: this.groupBy(),
      scopeIds: [] as string[],
    };
    const call = this.isEdit
      ? this.svc.update(this.id, spec)
      : this.svc.create(this.name(), spec);
    call.subscribe({
      next: () => this.back(),
      error: (err: any) => {
        this.saving.set(false);
        this.formErrors()?.reportError(err);
      },
    });
  }

  protected cancel(): void {
    this.back();
  }

  private back(): void {
    this.router.navigate([this.isEdit ? '../..' : '..'], { relativeTo: this.route });
  }
}
