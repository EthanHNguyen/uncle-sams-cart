-- Add pageview/UTM analytics columns to an existing D1 events table.
-- Run once against the remote D1 database before deploying the upgraded Worker.

alter table events add column path text;
alter table events add column utm_source text;
alter table events add column utm_medium text;
alter table events add column utm_campaign text;

create index if not exists idx_events_utm_campaign on events(utm_campaign);
