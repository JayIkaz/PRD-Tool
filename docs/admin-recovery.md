# Admin recovery (platform owner runbook)

Use this when an organisation has no working admin: the only admin has left, or
has lost their mailbox. Nobody inside the organisation can fix that, by design.
Requests arrive through **Members > Contact the people who run this service**:
they are stored in `support_requests` and emailed to `SUPPORT_EMAIL`.

## 1. Check the request is genuine
- Reply to the requester at the address on the request. It must match a row in
  `users` for that organisation.
- Email the current admin's address too and wait at least two working days for
  an objection, unless the mailbox is known to be dead.
- If in doubt, ask for confirmation from a second member of the organisation.

## 2. Find the people (Supabase SQL editor)
```sql
select s.created_at, s.message, u.email, u.organisation_id
from support_requests s join users u on u.id = s.user_id
order by s.created_at desc limit 20;

select id, email, display_name, is_admin, is_pm, created_at
from users where organisation_id = '<organisation id>' order by created_at;
```

## 3. Make the new admin, and record it
```sql
begin;
update users set is_admin = true
where id = '<new admin user id>' and organisation_id = '<organisation id>';

insert into organisation_audit_events
  (organisation_id, event_type, target_user_id, target_email, summary)
values
  ('<organisation id>', 'ADMIN_GRANTED_BY_PLATFORM', '<new admin user id>', '<their email>',
   'Made an admin by the platform owner after a help request');
commit;
```
Leave the old admin's flag alone unless they asked to be removed or the account
is compromised; the new admin cannot remove it, only the platform owner can:
```sql
update users set is_admin = false where id = '<old admin user id>';
```

## 4. Tell both people what was done.
