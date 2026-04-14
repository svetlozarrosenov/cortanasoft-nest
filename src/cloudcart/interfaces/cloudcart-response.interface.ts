import { CloudCartPaginationMeta } from './cloudcart-pagination.interface';

export interface CloudCartListResponse<T> {
  meta: { page: CloudCartPaginationMeta };
  links: { first?: string; next?: string; last?: string };
  data: T[];
  included?: any[];
}

export interface CloudCartSingleResponse<T> {
  data: T;
  included?: any[];
}
