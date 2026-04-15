/**
 * Capital Pyre — Ratings Controller
 * Interaction-level reputation: captured at match stage, not just post-deal.
 */

const db = require('../utils/db');

// POST /api/ratings
exports.submitRating = async (req, res, next) => {
  try {
    const { match_id, ratee_id, responsiveness, clarity, preparedness, seriousness, communication, follow_through, comment } = req.body;

    if (!match_id || !ratee_id)
      return res.status(400).json({ success: false, message: 'match_id and ratee_id required.' });

    // Verify the match exists and the rater is a party to it
    const [matchRows] = await db.query('SELECT * FROM matches WHERE id = ?', [match_id]);
    if (!matchRows.length)
      return res.status(404).json({ success: false, message: 'Match not found.' });

    // Determine which rating fields to use based on rater role
    const isInvestor = req.user.role === 'investor';
    const fields = isInvestor
      ? { responsiveness, clarity, preparedness }
      : { seriousness, communication, follow_through };

    // Validate at least one score provided
    const scores = Object.values(fields).filter(v => v !== undefined && v !== null);
    if (!scores.length)
      return res.status(400).json({ success: false, message: 'At least one rating dimension is required.' });

    // Validate score range
    if (scores.some(s => s < 1 || s > 5))
      return res.status(400).json({ success: false, message: 'All scores must be between 1 and 5.' });

    await db.query(
      `INSERT INTO ratings (rater_id, ratee_id, match_id, responsiveness, clarity, preparedness,
        seriousness, communication, follow_through, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         responsiveness = VALUES(responsiveness), clarity = VALUES(clarity),
         preparedness = VALUES(preparedness), seriousness = VALUES(seriousness),
         communication = VALUES(communication), follow_through = VALUES(follow_through),
         comment = VALUES(comment)`,
      [req.user.id, ratee_id, match_id,
       responsiveness || null, clarity || null, preparedness || null,
       seriousness || null, communication || null, follow_through || null,
       comment || null]
    );

    return res.status(201).json({ success: true, message: 'Rating submitted.' });
  } catch (err) { next(err); }
};

// GET /api/ratings/:userId — public reputation summary
exports.getUserRatings = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT
         COUNT(*) AS total_ratings,
         ROUND(AVG(CASE WHEN responsiveness IS NOT NULL THEN (responsiveness + clarity + preparedness) / 3.0 END), 1) AS avg_investor_score,
         ROUND(AVG(CASE WHEN seriousness IS NOT NULL THEN (seriousness + communication + follow_through) / 3.0 END), 1) AS avg_entrepreneur_score,
         ROUND(AVG(overall_score), 1) AS overall_avg
       FROM ratings WHERE ratee_id = ?`,
      [req.params.userId]
    );
    return res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};
