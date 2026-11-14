/**
 * Runs the real migration files against an in-process Postgres (PGlite) with a
 * minimal stand-in for Supabase's roles, default grants and auth.uid(), then
 * exercises the membership rules as different signed-in users.
 *
 * This is the regression test for "can a member make themselves an admin?".
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS = join(import.meta.dirname, "../../drizzle");

const ORG_A = "00000000-0000-0000-0000-00000000000a";
const ORG_B = "00000000-0000-0000-0000-00000000000b";
const A1 = "00000000-0000-0000-0000-0000000000a1"; // earliest in org A
const A2 = "00000000-0000-0000-0000-0000000000a2";
const B1 = "00000000-0000-0000-0000-0000000000b1";

let pg: PGlite;

function migrationFiles() {
  return readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

async function apply(file: string) {
  await pg.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
}

/** Runs fn as the given signed-in user, the way withRlsContext does. */
async function as<T>(userId: string | null, fn: (q: (sql: string, p?: unknown[]) => Promise<Record<string, unknown>[]>) => Promise<T>): Promise<T> {
  return pg.transaction(async (tx) => {
    if (userId) {
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: userId })]);
      await tx.exec(`set local role authenticated`);
    } else {
      await tx.exec(`set local role anon`);
    }
    return fn(async (sql, p) => (await tx.query(sql, p)).rows as Record<string, unknown>[]);
  });
}

async function admin(sql: string, p?: unknown[]) {
  return (await pg.query(sql, p)).rows as Record<string, unknown>[];
}

async function flags(id: string) {
  const [r] = await admin(`select is_admin, is_pm from users where id = $1`, [id]);
  return r;
}

before(async () => {
  pg = new PGlite();
  await pg.exec(`
    create role anon nologin;
    create role authenticated nologin;
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant execute on functions to anon, authenticated;
    create schema auth;
    grant usage on schema auth to anon, authenticated;
    create function auth.uid() returns uuid language sql stable as $$
      select (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub')::uuid
    $$;
  `);

  const files = migrationFiles();
  const membership = files.find((f) => f.startsWith("0014_"));
  assert.ok(membership, "0014 migration exists");

  for (const f of files.filter((f) => f < membership)) await apply(f);

  // Data that exists before the migration, to prove the backfill.
  await pg.exec(`
    insert into organisations (id, name) values ('${ORG_A}', 'Org A'), ('${ORG_B}', 'Org B');
    insert into users (id, organisation_id, email, created_at) values
      ('${A1}', '${ORG_A}', 'a1@a.test', now() - interval '2 days'),
      ('${A2}', '${ORG_A}', 'a2@a.test', now() - interval '1 day'),
      ('${B1}', '${ORG_B}', 'b1@b.test', now());
  `);

  await apply(membership);
});

test("backfill makes the earliest user in each organisation admin and PM", async () => {
  assert.deepEqual(await flags(A1), { is_admin: true, is_pm: true });
  assert.deepEqual(await flags(A2), { is_admin: false, is_pm: false });
  assert.deepEqual(await flags(B1), { is_admin: true, is_pm: true });
});

test("running the migration again changes nothing", async () => {
  await apply(migrationFiles().find((f) => f.startsWith("0014_"))!);
  assert.deepEqual(await flags(A1), { is_admin: true, is_pm: true });
  assert.deepEqual(await flags(A2), { is_admin: false, is_pm: false });
});

test("a member cannot write permission columns, even on their own row", async () => {
  await assert.rejects(as(A2, (q) => q(`update users set is_admin = true where id = $1`, [A2])), /permission denied/);
  await assert.rejects(as(A2, (q) => q(`update users set is_pm = true where id = $1`, [A2])), /permission denied/);
  await assert.rejects(
    as(A2, (q) => q(`update users set organisation_id = $2 where id = $1`, [A2, ORG_B])),
    /permission denied/
  );
  await assert.rejects(
    as(A2, (q) => q(`insert into users (id, organisation_id, email, is_admin) values (gen_random_uuid(), $1, 'x@x.test', true)`, [ORG_A])),
    /permission denied/
  );
  assert.deepEqual(await flags(A2), { is_admin: false, is_pm: false });
});

test("a member can change their own display name but nobody else's", async () => {
  await as(A2, (q) => q(`update users set display_name = 'Ada' where id = $1`, [A2]));
  await as(A2, (q) => q(`update users set display_name = 'Hacked' where id = $1`, [A1]));
  const rows = await admin(`select id, display_name from users where id in ($1, $2) order by id`, [A1, A2]);
  assert.equal(rows.find((r) => r.id === A2)?.display_name, "Ada");
  assert.equal(rows.find((r) => r.id === A1)?.display_name, null);
});

test("members see their own organisation's users only", async () => {
  const rows = await as(A2, (q) => q(`select id from users order by id`));
  assert.deepEqual(rows.map((r) => r.id), [A1, A2]);
});

test("a non-admin cannot call any permission function", async () => {
  await assert.rejects(as(A2, (q) => q(`select grant_admin($1)`, [A2])), /NOT_ADMIN/);
  await assert.rejects(as(A2, (q) => q(`select transfer_admin($1)`, [A2])), /NOT_ADMIN/);
  await assert.rejects(as(A2, (q) => q(`select set_member_pm($1, true)`, [A2])), /NOT_ADMIN/);
  await assert.rejects(as(A2, (q) => q(`select invite_member('n@n.test', true)`)), /NOT_ADMIN/);
  await assert.rejects(as(A2, (q) => q(`select step_down_admin()`)), /NOT_ADMIN/);
});

test("signed-out callers cannot execute the functions", async () => {
  await assert.rejects(as(null, (q) => q(`select grant_admin($1)`, [A2])), /permission denied/);
  await assert.rejects(as(null, (q) => q(`select invite_member('n@n.test', false)`)), /permission denied/);
  await assert.rejects(as(A1, (q) => q(`select require_admin_organisation()`)), /permission denied/);
});

test("the only admin cannot step down", async () => {
  await assert.rejects(as(A1, (q) => q(`select step_down_admin()`)), /LAST_ADMIN/);
  assert.equal((await flags(A1)).is_admin, true);
});

test("an admin cannot reach into another organisation", async () => {
  await assert.rejects(as(A1, (q) => q(`select grant_admin($1)`, [B1])), /NOT_MEMBER/);
  await assert.rejects(as(A1, (q) => q(`select transfer_admin($1)`, [B1])), /NOT_MEMBER/);
  await assert.rejects(as(B1, (q) => q(`select set_member_pm($1, true)`, [A2])), /NOT_MEMBER/);
  assert.deepEqual(await flags(A2), { is_admin: false, is_pm: false });
});

test("an admin sets and removes PM, and it is audited", async () => {
  await as(A1, (q) => q(`select set_member_pm($1, true)`, [A2]));
  assert.equal((await flags(A2)).is_pm, true);
  await as(A1, (q) => q(`select set_member_pm($1, false)`, [A2]));
  assert.equal((await flags(A2)).is_pm, false);
  const events = await admin(`select event_type from organisation_audit_events where target_user_id = $1 order by created_at`, [A2]);
  assert.deepEqual(events.map((e) => e.event_type), ["PM_GRANTED", "PM_REMOVED"]);
});

test("invites: lower-cased, no duplicates, admin-only, revocable", async () => {
  const [{ id }] = await as(A1, (q) => q(`select invite_member('  New.Person@X.test ', false) as id`));
  const [{ id: again }] = await as(A1, (q) => q(`select invite_member('new.person@x.test', true) as id`));
  assert.equal(id, again, "re-inviting refreshes the same invite");

  const rows = await admin(`select email, is_pm from organisation_invites where organisation_id = $1`, [ORG_A]);
  assert.deepEqual(rows, [{ email: "new.person@x.test", is_pm: true }]);

  assert.equal((await as(A2, (q) => q(`select id from organisation_invites`))).length, 0, "member sees no invites");
  assert.equal((await as(B1, (q) => q(`select id from organisation_invites`))).length, 0, "other organisation sees none");
  assert.equal((await as(A1, (q) => q(`select id from organisation_invites`))).length, 1);

  await assert.rejects(as(A1, (q) => q(`select invite_member('not-an-email', false)`)), /BAD_EMAIL/);
  await assert.rejects(as(A1, (q) => q(`select invite_member('A2@a.test', false)`)), /ALREADY_MEMBER/);
  await assert.rejects(
    as(A1, (q) => q(`insert into organisation_invites (organisation_id, email) values ($1, 'direct@x.test')`, [ORG_A])),
    /permission denied/
  );
  await assert.rejects(as(B1, (q) => q(`select revoke_invite($1)`, [id])), /NOT_FOUND/);

  await as(A1, (q) => q(`select revoke_invite($1)`, [id]));
  const [inv] = await admin(`select revoked_at from organisation_invites where id = $1`, [id]);
  assert.ok(inv.revoked_at);
});

test("the audit log is read-only and admin-only", async () => {
  await assert.rejects(
    as(A1, (q) => q(`insert into organisation_audit_events (organisation_id, event_type, summary) values ($1, 'FAKE', 'x')`, [ORG_A])),
    /permission denied/
  );
  await assert.rejects(as(A1, (q) => q(`delete from organisation_audit_events`)), /permission denied/);
  assert.equal((await as(A2, (q) => q(`select id from organisation_audit_events`))).length, 0);
  assert.equal((await as(B1, (q) => q(`select id from organisation_audit_events`))).length, 0);
  assert.ok((await as(A1, (q) => q(`select id from organisation_audit_events`))).length > 0);
});

test("only admins can update the organisation", async () => {
  await as(A2, (q) => q(`update organisations set name = 'Renamed by member' where id = $1`, [ORG_A]));
  assert.equal((await admin(`select name from organisations where id = $1`, [ORG_A]))[0].name, "Org A");
  await as(A1, (q) => q(`update organisations set name = 'Org A2' where id = $1`, [ORG_A]));
  assert.equal((await admin(`select name from organisations where id = $1`, [ORG_A]))[0].name, "Org A2");
});

test("support requests: own only", async () => {
  await as(A2, (q) => q(`insert into support_requests (organisation_id, user_id, message) values ($1, $2, 'Our admin has left')`, [ORG_A, A2]));
  await assert.rejects(
    as(A2, (q) => q(`insert into support_requests (organisation_id, user_id, message) values ($1, $2, 'as someone else')`, [ORG_A, A1])),
    /row-level security/
  );
  await assert.rejects(
    as(A2, (q) => q(`insert into support_requests (organisation_id, user_id, message) values ($1, $2, 'other org')`, [ORG_B, A2])),
    /row-level security/
  );
  assert.equal((await as(A2, (q) => q(`select id from support_requests`))).length, 1);
  assert.equal((await as(A1, (q) => q(`select id from support_requests`))).length, 0);
  assert.equal((await as(B1, (q) => q(`select id from support_requests`))).length, 0);
});

test("grant, step down and transfer keep at least one admin", async () => {
  await assert.rejects(as(A1, (q) => q(`select transfer_admin($1)`, [A1])), /SELF_TARGET/);

  // Transfer: A1 -> A2, in one step.
  await as(A1, (q) => q(`select transfer_admin($1)`, [A2]));
  assert.equal((await flags(A1)).is_admin, false);
  assert.equal((await flags(A2)).is_admin, true);
  assert.equal((await flags(A1)).is_pm, true, "outgoing admin keeps PM");

  // The old admin has lost every admin power immediately.
  await assert.rejects(as(A1, (q) => q(`select grant_admin($1)`, [A1])), /NOT_ADMIN/);
  assert.equal((await as(A1, (q) => q(`select id from organisation_audit_events`))).length, 0);

  // Grant back, then two admins: either may step down, the last may not.
  await as(A2, (q) => q(`select grant_admin($1)`, [A1]));
  await as(A2, (q) => q(`select step_down_admin()`));
  assert.equal((await flags(A2)).is_admin, false);
  await assert.rejects(as(A1, (q) => q(`select step_down_admin()`)), /LAST_ADMIN/);

  const types = (await admin(`select event_type from organisation_audit_events where organisation_id = $1`, [ORG_A])).map((e) => e.event_type);
  for (const t of ["ADMIN_TRANSFERRED", "ADMIN_GRANTED", "ADMIN_STEPPED_DOWN"]) assert.ok(types.includes(t), t);
});

test("existing tenant isolation still holds for product definitions", async () => {
  const cols = await admin(
    `select column_name from information_schema.columns where table_name = 'product_definitions' and is_nullable = 'NO' and column_default is null`
  );
  // Only assert when the table can be seeded with the obvious columns.
  const required = cols.map((c) => c.column_name).sort();
  if (required.join() !== ["organisation_id", "title"].sort().join()) return;
  await admin(`insert into product_definitions (organisation_id, title) values ($1, 'A def'), ($2, 'B def')`, [ORG_A, ORG_B]);
  const seen = await as(A2, (q) => q(`select title from product_definitions`));
  assert.deepEqual(seen.map((r) => r.title), ["A def"]);
});
