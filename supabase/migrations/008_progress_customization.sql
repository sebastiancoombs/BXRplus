-- Dashboard progress bar customization + success animation
alter table public.clients add column if not exists reward_bar_theme text default 'rainbow';
alter table public.clients add column if not exists reward_bar_style text default 'rounded';
alter table public.clients add column if not exists reward_success_animation text default 'confetti';
