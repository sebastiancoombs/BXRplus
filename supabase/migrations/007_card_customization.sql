-- Store card customization on the client
alter table public.clients add column card_theme text default 'galaxy';
alter table public.clients add column card_sticker text default '⭐';
