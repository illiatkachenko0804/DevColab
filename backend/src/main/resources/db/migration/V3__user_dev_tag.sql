-- DevTag: a unique @handle for each user.

alter table users add column dev_tag varchar(30);

-- Backfill existing users from their email local-part + a short id suffix
-- (the suffix guarantees uniqueness).
update users
set dev_tag = left(
        coalesce(
            nullif(regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9_]', '', 'g'), ''),
            'dev'),
        20)
    || '_' || substr(replace(id::text, '-', ''), 1, 6)
where dev_tag is null;

alter table users alter column dev_tag set not null;
create unique index uq_users_dev_tag on users (dev_tag);
