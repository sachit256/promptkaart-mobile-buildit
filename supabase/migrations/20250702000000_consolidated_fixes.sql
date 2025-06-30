-- Consolidated migration for fixing search and other essential features

-- Drop existing functions and types if they exist to ensure a clean slate
drop function if exists public.search_posts(text, uuid);
drop function if exists public.get_post_details(uuid, uuid);
drop type if exists public.admin_notification_type;

-- Recreate the admin notification type
create type public.admin_notification_type as enum ('announcement', 'update', 'promo');

-- Recreate the get_post_details function
create or replace function public.get_post_details(p_post_id uuid, p_user_id uuid)
returns table (
    id uuid,
    prompt text,
    ai_source text,
    images text[],
    category text,
    tags text[],
    likes int,
    comments int,
    shares int,
    created_at timestamptz,
    is_liked boolean,
    is_bookmarked boolean,
    author json
)
language plpgsql
as $$
begin
  return query
  select
    p.id,
    p.prompt,
    p.ai_source,
    p.images,
    p.category,
    p.tags,
    p.likes_count,
    p.comments_count,
    p.shares_count,
    p.created_at,
    exists(select 1 from likes l where l.post_id = p.id and l.user_id = p_user_id) as is_liked,
    exists(select 1 from bookmarks b where b.post_id = p.id and b.user_id = p_user_id) as is_bookmarked,
    json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar) as author
  from posts p
  join profiles u on p.user_id = u.id
  where p.id = p_post_id;
end;
$$;

-- Recreate the search_posts function
create or replace function public.search_posts(search_term text, p_user_id uuid)
returns table (
    id uuid,
    prompt text,
    ai_source text,
    images text[],
    category text,
    tags text[],
    likes integer,
    comments integer,
    shares integer,
    created_at timestamp with time zone,
    is_liked boolean,
    is_bookmarked boolean,
    author json
) as $$
begin
    return query
    select
        p.id,
        p.prompt,
        p.ai_source,
        p.images,
        p.category,
        p.tags,
        p.likes_count as likes,
        p.comments_count as comments,
        p.shares_count as shares,
        p.created_at,
        exists(select 1 from likes l where l.post_id = p.id and l.user_id = p_user_id) as is_liked,
        exists(select 1 from bookmarks b where b.post_id = p.id and b.user_id = p_user_id) as is_bookmarked,
        json_build_object(
            'id', u.id,
            'name', u.name,
            'avatar', u.avatar
        ) as author
    from
        posts p
    join
        profiles u on p.user_id = u.id
    where
        p.prompt ilike '%' || search_term || '%'
        or p.category ilike '%' || search_term || '%'
        or exists (
            select 1 from unnest(p.tags) as tag where tag ilike '%' || search_term || '%'
        );
end;
$$ language plpgsql; 