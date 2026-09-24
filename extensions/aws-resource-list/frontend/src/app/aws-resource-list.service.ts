import { Injectable, Inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export const REMOTE_DuploHttpClient = 'REMOTE_DuploHttpClient';
export const REMOTE_UserSession = 'REMOTE_UserSession';

const ORIGIN_TYPE = 'AwsResourceList';
const SUB_TYPE = 'aws-resource-list';
const REST_SEGMENT = 'extensions/aws-resource-lists';

export interface Ec2InstanceInfo {
  instanceId?: string;
  instanceType?: string;
  state?: string;
  name?: string;
  publicIpAddress?: string;
}

export interface AwsResourceList {
  id: string;
  name: string;
  status: string;
  subStatus?: string;
  createdAt?: string;
  spec?: { region?: string };
  result?: { instances?: Ec2InstanceInfo[] };
}

@Injectable({ providedIn: 'root' })
export class AwsResourceListService {
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

  list(): Observable<AwsResourceList[]> {
    return this.http.get(this.base()).pipe(map((r: any) => {
      const d = this.unwrap(r);
      return (d?.items ?? d ?? []) as AwsResourceList[];
    }));
  }

  get(id: string): Observable<AwsResourceList> {
    return this.http.get(`${this.base()}/${id}`).pipe(map((r: any) => this.unwrap(r)));
  }

  create(name: string, spec: { region: string }): Observable<AwsResourceList> {
    return this.http.post(this.base(), { name, spec }).pipe(map((r: any) => this.unwrap(r)));
  }

  update(id: string, spec: { region: string }): Observable<AwsResourceList> {
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
