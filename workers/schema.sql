-- D1 schema for Uncle Sam's Cart share/source event tracking.

create table if not exists events (
  id integer primary key autoincrement,
  event text not null,
  app text not null,
  created_at text not null,
  count integer default 0,
  item_id text,
  category text,
  origin text,
  referer text,
  path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  share_title text,
  share_text text,
  share_url text,
  share_item_ids text,
  share_item_titles text,
  share_method text
);

create index if not exists idx_events_event_created_at on events(event, created_at);
create index if not exists idx_events_item_id on events(item_id);
create index if not exists idx_events_utm_campaign on events(utm_campaign);
