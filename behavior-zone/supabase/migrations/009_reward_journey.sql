-- Reward journey customization for child-friendly vertical progress cards
alter table public.rewards add column if not exists journey_preset text default 'space';
alter table public.rewards add column if not exists traveler_icon text default '🚀';
alter table public.rewards add column if not exists destination_icon text default '🌙';
alter table public.rewards add column if not exists journey_theme text default 'space';
