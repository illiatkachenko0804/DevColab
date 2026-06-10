-- Auth: email verification + verified flag.

alter table users add column email_verified boolean not null default false;

create table email_verification_codes (
    id         uuid primary key default gen_random_uuid(),
    email      varchar(255) not null,
    code_hash  varchar(255) not null,
    purpose    varchar(20)  not null default 'REGISTER',
    expires_at timestamptz  not null,
    consumed   boolean      not null default false,
    attempts   int          not null default 0,
    created_at timestamptz  not null default now()
);
create index idx_evc_email on email_verification_codes(email);
create index idx_evc_email_active on email_verification_codes(email, consumed, created_at desc);
