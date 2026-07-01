import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { users, groups, userGroups, incidents } from './schema';
import * as schema from './schema';

async function seed(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const existing = await pool.query('SELECT 1 FROM groups LIMIT 1');
  if (existing.rowCount && existing.rowCount > 0) {
    console.log('Seed skipped — groups table already has data.');
    await pool.end();
    return;
  }

  const nextKey = async (): Promise<string> => {
    const result = await pool.query(
      `SELECT 'INC-' || LPAD(nextval('incident_key_seq')::text, 4, '0') AS key`
    );
    return result.rows[0].key as string;
  };

  const daysAgo = (n: number): Date =>
    new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  const [dba, ops, platform, security] = await db
    .insert(groups)
    .values([
      {
        name: 'DBA',
        description:
          'Owns all database operations, query optimization, and nightly data refresh jobs for policy and claims data.',
      },
      {
        name: 'Ops / Prod Support',
        description:
          'Owns production infrastructure, deployments, on-call response, and SLA management across all environments.',
      },
      {
        name: 'Platform',
        description:
          'Owns the internal developer platform, CI/CD pipelines, shared services, and build tooling.',
      },
      {
        name: 'Security',
        description:
          'Owns threat detection, vulnerability management, compliance audits, and incident response for security events.',
      },
    ])
    .returning();

  const [alice, bob, carol, david, eve, frank, grace, henry] = await db
    .insert(users)
    .values([
      { name: 'Alice Chen', email: 'alice@incidenthub.dev' },
      { name: 'Bob Patel', email: 'bob@incidenthub.dev' },
      { name: 'Carol Wu', email: 'carol@incidenthub.dev' },
      { name: 'David Kim', email: 'david@incidenthub.dev' },
      { name: 'Eve Ross', email: 'eve@incidenthub.dev' },
      { name: 'Frank Torres', email: 'frank@incidenthub.dev' },
      { name: 'Grace Liu', email: 'grace@incidenthub.dev' },
      { name: 'Henry Obi', email: 'henry@incidenthub.dev' },
    ])
    .returning();

  await db.insert(userGroups).values([
    { userId: alice.userId, groupId: dba.groupId },
    { userId: bob.userId, groupId: dba.groupId },
    { userId: bob.userId, groupId: platform.groupId },
    { userId: carol.userId, groupId: ops.groupId },
    { userId: david.userId, groupId: ops.groupId },
    { userId: david.userId, groupId: security.groupId },
    { userId: eve.userId, groupId: platform.groupId },
    { userId: frank.userId, groupId: security.groupId },
    { userId: grace.userId, groupId: security.groupId },
    { userId: grace.userId, groupId: dba.groupId },
    { userId: henry.userId, groupId: ops.groupId },
  ]);

  await db.insert(incidents).values([
    {
      key: await nextKey(),
      title: 'Nightly policy data refresh failed — customers seeing stale balances',
      description:
        "The scheduled 02:00 UTC refresh job for the policy_balances materialized view timed out after 45 minutes. Customers are reporting that their dashboard shows yesterday's coverage amounts. Job logs show a lock contention error on the underwriting_facts table. Downstream claims processing is unaffected for now, but reinsurance reporting will be stale at 08:00 UTC.",
      severity: 'Critical',
      status: 'InProgress',
      reporterId: carol.userId,
      assigneeId: alice.userId,
      targetGroupId: dba.groupId,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(0),
    },
    {
      key: await nextKey(),
      title: 'Production API gateway returning 503 for claims submission endpoint',
      description:
        'POST /api/v2/claims/submit has been returning 503 errors intermittently since 09:14 UTC. Error rate is currently 34% of requests. The gateway logs show upstream connection pool exhaustion. Claims agents are unable to submit new claims; workaround is manual entry via the legacy portal. SLA breach expected if not resolved within 2 hours.',
      severity: 'Critical',
      status: 'Open',
      reporterId: henry.userId,
      assigneeId: null,
      targetGroupId: ops.groupId,
      createdAt: daysAgo(0),
      updatedAt: daysAgo(0),
    },
    {
      key: await nextKey(),
      title: 'Suspicious login attempts detected from unrecognized IP range',
      description:
        'WAF logs show 847 failed authentication attempts in the past 30 minutes originating from the 185.220.x.x CIDR block (known Tor exit nodes). Three agent accounts have been locked due to consecutive failures. No successful logins from this range confirmed yet, but the pattern matches credential stuffing. Affected accounts have been notified; MFA enforcement is under review.',
      severity: 'High',
      status: 'InProgress',
      reporterId: frank.userId,
      assigneeId: david.userId,
      targetGroupId: security.groupId,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
    },
    {
      key: await nextKey(),
      title: 'CI pipeline fails intermittently on integration test suite',
      description:
        'The integration test suite in the underwriting-service repo has been failing at a ~20% rate over the past week. Failures are non-deterministic and appear in tests that hit the test Postgres instance. Suspect a timing issue with container startup in CI. Flaky tests are blocking PR merges; developers are re-triggering pipelines as a workaround.',
      severity: 'Medium',
      status: 'Resolved',
      reporterId: bob.userId,
      assigneeId: eve.userId,
      targetGroupId: platform.groupId,
      resolvedAt: daysAgo(3),
      createdAt: daysAgo(7),
      updatedAt: daysAgo(3),
    },
    {
      key: await nextKey(),
      title: 'Premium calculation engine timing out for multi-vehicle policies',
      description:
        "Policies with 4+ vehicles are experiencing timeout errors (>30s) during the premium rating step. The rating engine is hitting an N+1 query pattern introduced in last week's v3.4.2 release. Workaround is manual override by underwriters. Approximately 12% of new policies are affected; renewals are unaffected as they use the legacy rating path.",
      severity: 'High',
      status: 'Open',
      reporterId: alice.userId,
      assigneeId: null,
      targetGroupId: dba.groupId,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
    {
      key: await nextKey(),
      title: 'TLS certificate expiring in 7 days on claims-api.internal',
      description:
        'The TLS certificate for claims-api.internal (used by the broker portal and mobile app) expires 2024-01-22. Auto-renewal via Vault PKI failed silently due to a Vault token rotation that invalidated the renewal credential. Manual renewal has been completed and deployed. Post-resolution monitoring confirmed no certificate errors in production.',
      severity: 'High',
      status: 'Resolved',
      reporterId: david.userId,
      assigneeId: frank.userId,
      targetGroupId: security.groupId,
      resolvedAt: daysAgo(5),
      createdAt: daysAgo(8),
      updatedAt: daysAgo(5),
    },
    {
      key: await nextKey(),
      title: 'Production deployment failed — rollback triggered',
      description:
        'The v3.5.0 deployment to production failed at the health-check stage. The new container failed to start due to a missing DATABASE_REPLICA_URL environment variable not included in the Railway environment config. Rollback to v3.4.2 completed successfully. Post-mortem: env var checklist added to deployment runbook.',
      severity: 'High',
      status: 'Closed',
      reporterId: carol.userId,
      assigneeId: henry.userId,
      targetGroupId: ops.groupId,
      resolvedAt: daysAgo(10),
      createdAt: daysAgo(14),
      updatedAt: daysAgo(10),
    },
    {
      key: await nextKey(),
      title: 'Kafka consumer lag spiking on underwriting-events topic',
      description:
        'Consumer group underwriting-processor is lagging by 42,000 messages on the underwriting-events topic as of 11:30 UTC. Lag started accumulating after the v3.4.5 release which added heavier deserialization logic. Current throughput: 120 msg/s vs 380 msg/s expected. The processor pod count has been scaled from 2 to 6; lag is decreasing but not yet cleared.',
      severity: 'Medium',
      status: 'InProgress',
      reporterId: eve.userId,
      assigneeId: bob.userId,
      targetGroupId: platform.groupId,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(0),
    },
    {
      key: await nextKey(),
      title: 'Session tokens not invalidated after password reset',
      description:
        "A review of the auth service found that existing session tokens remain valid after a user resets their password. A user who resets their password does not invalidate active sessions on other devices. This means that if credentials were stolen, an attacker's session would persist through a password reset. Affects all user types; severity elevated as this is a security control failure.",
      severity: 'Critical',
      status: 'Open',
      reporterId: grace.userId,
      assigneeId: null,
      targetGroupId: security.groupId,
      createdAt: daysAgo(0),
      updatedAt: daysAgo(0),
    },
    {
      key: await nextKey(),
      title: 'Policy PDF generation throwing NullPointerException for edge case',
      description:
        'When generating policy documents for plans with zero additional drivers listed, the PDF service throws a NullPointerException at DriverSection.render(). Affects approximately 3% of policies (those with primary driver only). Customers receive a generic error and must contact their agent to get the document. Fix is low-risk: null-check on the drivers list before rendering the section.',
      severity: 'Low',
      status: 'Resolved',
      reporterId: bob.userId,
      assigneeId: eve.userId,
      targetGroupId: platform.groupId,
      resolvedAt: daysAgo(12),
      createdAt: daysAgo(18),
      updatedAt: daysAgo(12),
    },
  ]);

  console.log('Seed completed successfully');
  console.log('\nSeeded users — use these IDs as the X-User-Id header:');
  console.log(`  Alice Chen    (DBA)                  ${alice.userId}`);
  console.log(`  Bob Patel     (DBA + Platform)        ${bob.userId}`);
  console.log(`  Carol Wu      (Ops)                   ${carol.userId}`);
  console.log(`  David Kim     (Ops + Security)        ${david.userId}`);
  console.log(`  Eve Ross      (Platform)              ${eve.userId}`);
  console.log(`  Frank Torres  (Security)              ${frank.userId}`);
  console.log(`  Grace Liu     (Security + DBA)        ${grace.userId}`);
  console.log(`  Henry Obi     (Ops)                   ${henry.userId}`);

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
