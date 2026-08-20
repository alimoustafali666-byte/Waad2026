import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  const { name, commissionPercent } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const { rows: existing } = await query("select id from agencies where owner_user_id = $1", [
    req.user.userId,
  ]);
  if (existing.length > 0) {
    return res.status(409).json({ error: "you already own an agency" });
  }

  const { rows } = await query(
    "insert into agencies (name, commission_percent, owner_user_id) values ($1, $2, $3) returning id, name, commission_percent",
    [name, commissionPercent ?? 20, req.user.userId]
  );
  res.status(201).json({ agency: rows[0] });
});

router.get("/me", requireAuth, async (req, res) => {
  const { rows } = await query("select id, name, commission_percent from agencies where owner_user_id = $1", [
    req.user.userId,
  ]);
  res.json({ agency: rows[0] ?? null });
});

router.get("/hosts/me", requireAuth, async (req, res) => {
  const { rows } = await query("select agency_id, diamond_balance from hosts where user_id = $1", [
    req.user.userId,
  ]);
  if (rows.length === 0) {
    return res.json({ isHost: false, diamondBalance: 0, agencyId: null });
  }
  res.json({
    isHost: true,
    diamondBalance: Number(rows[0].diamond_balance),
    agencyId: rows[0].agency_id,
  });
});

async function requireAgencyOwner(req, res) {
  const { rows } = await query("select id, name, owner_user_id from agencies where id = $1", [
    req.params.id,
  ]);
  if (rows.length === 0) {
    res.status(404).json({ error: "agency not found" });
    return null;
  }
  if (rows[0].owner_user_id !== req.user.userId) {
    res.status(403).json({ error: "only the agency owner can do this" });
    return null;
  }
  return rows[0];
}

router.post("/:id/hosts", requireAuth, async (req, res) => {
  const agency = await requireAgencyOwner(req, res);
  if (!agency) return;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  await query(
    `insert into hosts (user_id, agency_id, diamond_balance) values ($1, $2, 0)
     on conflict (user_id) do update set agency_id = $2`,
    [userId, req.params.id]
  );
  await query("update users set is_host = true where id = $1", [userId]);
  res.status(201).json({ ok: true });
});

router.delete("/:id/hosts/:userId", requireAuth, async (req, res) => {
  const agency = await requireAgencyOwner(req, res);
  if (!agency) return;
  await query("update hosts set agency_id = null where user_id = $1 and agency_id = $2", [
    req.params.userId,
    req.params.id,
  ]);
  res.json({ ok: true });
});

router.get("/:id/dashboard", requireAuth, async (req, res) => {
  const agency = await requireAgencyOwner(req, res);
  if (!agency) return;

  const { rows: hosts } = await query(
    `select h.user_id, u.display_name, h.diamond_balance
     from hosts h join users u on u.id = h.user_id
     where h.agency_id = $1
     order by h.diamond_balance desc`,
    [req.params.id]
  );

  res.json({
    agency: { id: agency.id, name: agency.name },
    hosts: hosts.map((h) => ({
      userId: h.user_id,
      displayName: h.display_name,
      diamondBalance: Number(h.diamond_balance),
    })),
  });
});

router.post("/payout-requests", requireAuth, async (req, res) => {
  const { diamondsRequested } = req.body;
  if (!diamondsRequested || diamondsRequested <= 0) {
    return res.status(400).json({ error: "diamondsRequested must be positive" });
  }
  const { rows: hostRows } = await query("select diamond_balance from hosts where user_id = $1", [
    req.user.userId,
  ]);
  if (hostRows.length === 0 || Number(hostRows[0].diamond_balance) < diamondsRequested) {
    return res.status(402).json({ error: "insufficient diamond balance" });
  }
  const { rows } = await query(
    "insert into payout_requests (host_user_id, diamonds_requested) values ($1, $2) returning id, status",
    [req.user.userId, diamondsRequested]
  );
  res.status(201).json({ payoutRequest: rows[0] });
});

router.get("/:id/payout-requests", requireAuth, async (req, res) => {
  const agency = await requireAgencyOwner(req, res);
  if (!agency) return;

  const { rows } = await query(
    `select pr.id, pr.host_user_id, u.display_name, pr.diamonds_requested, pr.status, pr.requested_at
     from payout_requests pr
     join hosts h on h.user_id = pr.host_user_id
     join users u on u.id = pr.host_user_id
     where h.agency_id = $1
     order by pr.requested_at desc`,
    [req.params.id]
  );
  res.json({ payoutRequests: rows });
});

router.post("/payout-requests/:requestId/approve", requireAuth, async (req, res) => {
  const { rows: reqRows } = await query(
    `select pr.id, pr.host_user_id, pr.diamonds_requested, h.agency_id
     from payout_requests pr join hosts h on h.user_id = pr.host_user_id
     where pr.id = $1`,
    [req.params.requestId]
  );
  if (reqRows.length === 0) return res.status(404).json({ error: "payout request not found" });
  const payoutRequest = reqRows[0];

  const { rows: agencyRows } = await query("select owner_user_id from agencies where id = $1", [
    payoutRequest.agency_id,
  ]);
  if (agencyRows.length === 0 || agencyRows[0].owner_user_id !== req.user.userId) {
    return res.status(403).json({ error: "only the agency owner can approve this" });
  }

  await query(
    "update hosts set diamond_balance = diamond_balance - $1 where user_id = $2",
    [payoutRequest.diamonds_requested, payoutRequest.host_user_id]
  );
  await query("update payout_requests set status = 'approved' where id = $1", [req.params.requestId]);
  res.json({ ok: true });
});

export default router;
