import {
  evaluateWatchCriteria,
  hasUsableSnapshotSignals,
  shouldAlertOnTransition,
} from "../../lib/monitor/alert-eligibility";

const soldout = {
  extracted_price: null,
  extracted_keywords: ["Sold Out"] as string[],
  raw_text: "Sold Out",
};
const avail = {
  extracted_price: "$42.00",
  extracted_keywords: [] as string[],
  raw_text: "Buy tickets select tickets",
};

const noThreshold = null;
const prev = evaluateWatchCriteria(noThreshold, soldout);
const curr = evaluateWatchCriteria(noThreshold, avail);
console.log(
  "No-threshold: prev.met=%s curr.met=%s transition=%s (expect true)",
  prev.met,
  curr.met,
  shouldAlertOnTransition(true, prev.met, curr.met),
);

const prevT = evaluateWatchCriteria(100, {
  ...soldout,
  extracted_price: "$200.00",
});
const currT = evaluateWatchCriteria(100, { ...avail, extracted_price: "$42.00" });
console.log(
  "Threshold $100: prev.met=%s curr.met=%s transition=%s (expect true)",
  prevT.met,
  currT.met,
  shouldAlertOnTransition(true, prevT.met, currT.met),
);

console.log(
  "First snapshot (no prev): transition=%s (expect false)",
  shouldAlertOnTransition(false, false, true),
);

console.log(
  "Empty snapshot unusable=%s (expect true)",
  !hasUsableSnapshotSignals({
    extracted_price: null,
    extracted_keywords: [],
    raw_text: "",
  }),
);

if (
  !shouldAlertOnTransition(true, prev.met, curr.met) ||
  !shouldAlertOnTransition(true, prevT.met, currT.met) ||
  shouldAlertOnTransition(false, false, true)
) {
  process.exit(1);
}
console.log("alert-eligibility checks: OK");
