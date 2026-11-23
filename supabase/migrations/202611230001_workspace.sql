begin;
create table public.quod_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null check (revision > 0),
  document text not null check (octet_length(document) between 2 and 8000000),
  saved_at timestamptz not null default now()
);
alter table public.quod_workspaces enable row level security;
revoke all on public.quod_workspaces from public, anon, authenticated;
grant select on public.quod_workspaces to authenticated;
create policy read_own_workspace on public.quod_workspaces for select
  to authenticated using ((select auth.uid()) = owner_id);

-- Every write, including the first save, compares the version the device last read.
create function public.quod_save_workspace(account_id uuid, expected_revision bigint, contents text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  next_revision bigint;
begin
  if actor is null or actor is distinct from account_id then
    raise exception 'Sign in to this account' using errcode = '42501';
  end if;
  if expected_revision is null or expected_revision < 0 or contents is null
     or octet_length(contents) not between 2 and 8000000 then
    raise exception 'Invalid workspace size or revision' using errcode = '22023';
  end if;
  if (contents::jsonb -> 'version') is distinct from '1'::jsonb
     or jsonb_typeof(contents::jsonb -> 'tasks') is distinct from 'array' then
    raise exception 'Invalid workspace' using errcode = '22023';
  end if;
  if expected_revision = 0 then
    insert into public.quod_workspaces(owner_id,revision,document) values(actor,1,contents)
      on conflict (owner_id) do nothing returning revision into next_revision;
  else
    update public.quod_workspaces set document=contents,revision=revision+1,saved_at=now()
      where owner_id=actor and revision=expected_revision returning revision into next_revision;
  end if;
  return next_revision;
end;
$$;
revoke all on function public.quod_save_workspace(uuid,bigint,text) from public, anon, authenticated;
grant execute on function public.quod_save_workspace(uuid,bigint,text) to authenticated;
commit;
