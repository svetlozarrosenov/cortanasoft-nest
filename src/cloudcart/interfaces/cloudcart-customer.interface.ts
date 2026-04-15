export interface CloudCartCustomer {
  type: 'customers';
  id: string;
  attributes: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    company: string | null;
    accepts_marketing: boolean;
    note: string | null;
    group_id: number | null;
    date_added: string;
    updated_at: string;
  };
}
