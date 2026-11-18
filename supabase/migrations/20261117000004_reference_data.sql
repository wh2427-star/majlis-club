-- Reference data the product needs in every environment: categories, sports, clusters, areas.
-- Area centre points are approximate.

insert into public.categories (slug, name) values ('sports', 'Sports')
on conflict (slug) do nothing;

insert into public.sports (category_id, slug, name, sort)
select c.id, s.slug, s.name, s.sort
from public.categories c,
  (values ('football', 'Football', 1), ('rugby', 'Rugby', 2), ('basketball', 'Basketball', 3),
          ('cricket', 'Cricket', 4), ('swimming', 'Swimming', 5), ('netball', 'Netball', 6),
          ('tennis', 'Tennis', 7), ('gymnastics', 'Gymnastics', 8), ('martial-arts', 'Martial arts', 9))
    as s(slug, name, sort)
where c.slug = 'sports'
on conflict (slug) do nothing;

insert into public.clusters (slug, name, sort, status) values
  ('ranches-meadows-springs', 'Arabian Ranches, the Meadows and the Springs', 1, 'live'),
  ('umm-suqeim-jumeirah', 'Umm Suqeim and Jumeirah', 2, 'coming_soon')
on conflict (slug) do nothing;

insert into public.areas (cluster_id, slug, name, lat, lng, status, sort)
select cl.id, a.slug, a.name, a.lat, a.lng, a.status::public.area_status, a.sort
from public.clusters cl
join (values
  ('ranches-meadows-springs', 'arabian-ranches', 'Arabian Ranches', 25.0530, 55.2690, 'live', 1),
  ('ranches-meadows-springs', 'the-meadows', 'The Meadows', 25.0650, 55.1620, 'live', 2),
  ('ranches-meadows-springs', 'the-springs', 'The Springs', 25.0560, 55.1820, 'live', 3),
  ('umm-suqeim-jumeirah', 'umm-suqeim', 'Umm Suqeim', 25.1450, 55.2100, 'coming_soon', 4),
  ('umm-suqeim-jumeirah', 'jumeirah', 'Jumeirah', 25.2100, 55.2500, 'coming_soon', 5)
) as a(cluster_slug, slug, name, lat, lng, status, sort) on a.cluster_slug = cl.slug
on conflict (slug) do nothing;
