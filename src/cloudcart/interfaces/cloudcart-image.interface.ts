export interface CloudCartImage {
  type: 'images';
  id: string;
  attributes: {
    position: number;
    thumbs: Record<string, string>;
  };
}
