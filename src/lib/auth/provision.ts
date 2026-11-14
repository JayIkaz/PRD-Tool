import { db } from "@/db/client";
import { organisations, users, organisationInvites, organisationAuditEvents } from "@/db/schema";
import { and, desc, eq, gt, isNull } from "drizzle-orm";

/**
 * First-login provisioning for a brand-new Supabase auth user. One of two
 * things happens:
 *
 * 1. JOIN: an admin has invited this email address (organisation_invites,
 *    pending and not expired) AND the caller says the address is verified.
 *    The user row is created in that organisation, with the PM flag the invite
 *    carried and never with admin rights.
 * 2. CREATE: otherwise a new organisation is created and this user is its
 *    first admin and PM.
 *
 * `emailVerified` must be true only when Supabase has confirmed the person
 * controls the address (a code or link they received was accepted). Without
 * that, an invite is ignored: otherwise anyone could type an invited address
 * into the signup form and land inside someone else's organisation.
 *
 * Organisation creation and the permission flags are deliberately
 * service-role operations, not something an authenticated user does via RLS
 * (see 0002_rls_organisations.sql and 0014_org_membership.sql). Runs on the
 * plain `db` client for that reason; never call this per-request for anything
 * except first-login provisioning.
 *
 * Idempotent: if the user row already exists it is returned untouched, so
 * firing twice (signup action, then callback) never creates a second
 * organisation or moves anyone between organisations.
 */
export async function provisionOrganisationAndUser(params: {
  userId: string;
  email: string;
  emailVerified: boolean;
  organisationName?: string;
  displayName?: string;
}) {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, params.userId),
  });
  if (existing) return existing;

  const email = params.email.trim().toLowerCase();

  return db.transaction(async (tx) => {
    if (params.emailVerified && email) {
      // Most recent pending invite wins if more than one organisation invited
      // this address. FOR UPDATE so two concurrent first logins can't both
      // consume it.
      const [invite] = await tx
        .select()
        .from(organisationInvites)
        .where(
          and(
            eq(organisationInvites.email, email),
            isNull(organisationInvites.acceptedAt),
            isNull(organisationInvites.revokedAt),
            gt(organisationInvites.expiresAt, new Date())
          )
        )
        .orderBy(desc(organisationInvites.createdAt))
        .limit(1)
        .for("update");

      if (invite) {
        const [user] = await tx
          .insert(users)
          .values({
            id: params.userId,
            organisationId: invite.organisationId,
            email: params.email,
            displayName: params.displayName?.trim() || null,
            isAdmin: false,
            isPm: invite.isPm,
          })
          .returning();

        await tx
          .update(organisationInvites)
          .set({ acceptedAt: new Date(), acceptedBy: user.id })
          .where(eq(organisationInvites.id, invite.id));

        await tx.insert(organisationAuditEvents).values({
          organisationId: invite.organisationId,
          actorUserId: user.id,
          eventType: "INVITE_ACCEPTED",
          targetUserId: user.id,
          targetEmail: email,
          summary: invite.isPm ? "Joined as a product manager" : "Joined as a member",
        });

        return user;
      }
    }

    const [org] = await tx
      .insert(organisations)
      .values({
        name: params.organisationName?.trim() || `${params.email}'s organisation`,
      })
      .returning();

    const [user] = await tx
      .insert(users)
      .values({
        id: params.userId,
        organisationId: org.id,
        email: params.email,
        displayName: params.displayName?.trim() || null,
        // The person who creates an organisation runs it until they hand over.
        isAdmin: true,
        isPm: true,
      })
      .returning();

    await tx.insert(organisationAuditEvents).values({
      organisationId: org.id,
      actorUserId: user.id,
      eventType: "ORGANISATION_CREATED",
      targetUserId: user.id,
      targetEmail: email,
      summary: "Created the organisation",
    });

    return user;
  });
}
