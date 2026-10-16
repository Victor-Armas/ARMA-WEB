alter table public.product_images drop constraint product_images_thumbnail_path_check;
alter table public.product_images add constraint product_images_thumbnail_path_check
check (thumbnail_path is null or (thumbnail_path like 'products/thumbnails/%' and right(thumbnail_path,5)='.webp'));
