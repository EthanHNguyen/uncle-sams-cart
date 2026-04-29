-- Capture exact shared payloads for share/copy analytics and future copy tuning.

alter table events add column share_title text;
alter table events add column share_text text;
alter table events add column share_url text;
alter table events add column share_item_ids text;
alter table events add column share_item_titles text;
alter table events add column share_method text;
