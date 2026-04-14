export interface CloudCartCategory {
  type: 'categories';
  id: string;
  attributes: {
    name: string;
    order: number;
    description: string | null;
    parent_id: number | null;
    seo_title: string | null;
    seo_description: string | null;
    url_handle: string;
    date_modified: string;
    image: string | null;
    image_url: string | null;
  };
}
