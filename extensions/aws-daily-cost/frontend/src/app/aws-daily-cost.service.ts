import { Injectable, Inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export const REMOTE_DuploHttpClient = 'REMOTE_DuploHttpClient';
export const REMOTE_UserSession = 'REMOTE_UserSession';

const ORIGIN_TYPE = 'AwsDailyCost';
const SUB_TYPE = 'aws-daily-cost';
const REST_SEGMENT = 'extensions/aws-daily-costs';

export interface CostEntry {
  date: string;
  group: string;
  amount: number;
  unit: string;
}

export interface AwsDailyCost {
  id: string;
  name: string;
  status: string;
  subStatus?: string;
  createdAt?: string;
  spec?: {
    month?: string;
    scopeIds?: string[];
    region?: string;
    groupBy?: string;
  };
  result?: {
    costEntries?: CostEntry[];
    totalCost?: number;
    currency?: string;
    queryMonth?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AwsDailyCostService {
  constructor(
    @Inject(REMOTE_DuploHttpClient) private http: any,
    @Inject(REMOTE_UserSession) private session: any,
  ) {}

  workspaceId(): string {
    return this.session?.tenant?.TenantId ?? '';
  }

  private base(): string {
    return `/v1/aiservicedesk/user/data/workspaces/${this.workspaceId()}/environment/${REST_SEGMENT}`;
  }

  private unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

  list(): Observable<AwsDailyCost[]> {
    return this.http.get(this.base()).pipe(map((r: any) => {
      const d = this.unwrap(r);
      return (d?.items ?? d ?? []) as AwsDailyCost[];
    }));
  }

  get(id: string): Observable<AwsDailyCost> {
    return this.http.get(`${this.base()}/${id}`).pipe(map((r: any) => this.unwrap(r)));
  }

  create(name: string, spec: { month: string; region: string; groupBy: string; scopeIds: string[] }): Observable<AwsDailyCost> {
    return this.http.post(this.base(), { name, spec }).pipe(map((r: any) => this.unwrap(r)));
  }

  update(id: string, spec: { month: string; region: string; groupBy: string }): Observable<AwsDailyCost> {
    return this.http.patch(`${this.base()}/${id}`, { spec }).pipe(map((r: any) => this.unwrap(r)));
  }

  getViewTemplate(type: string = ORIGIN_TYPE, subType: string = SUB_TYPE): Observable<any | null> {
    const q = `type=${encodeURIComponent(type)}&subType=${encodeURIComponent(subType)}`;
    return this.http.get(`${this.base()}/view-template?${q}`).pipe(
      map((r: any) => this.unwrap(r) ?? null),
      catchError(() => of(null)),
    );
  }
}
