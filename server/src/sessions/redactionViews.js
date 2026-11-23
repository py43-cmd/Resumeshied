/** Allowlist for saved plans: IDs, types, pages and boxes only. No values. */

function toPublicPlanItem(item) {
  return {
    itemId: item.itemId,
    source: item.source,
    ...(item.detectionId ? { detectionId: item.detectionId } : {}),
    type: item.type,
    method: item.method,
    pageNumber: item.pageNumber,
    bboxes: item.bboxes,
    needsReview: item.needsReview,
  };
}

export function toPublicRedactionPlan(plan) {
  if (!plan) {
    return { planStatus: 'pending', plan: null };
  }

  return {
    planStatus: plan.status,
    plan: {
      planId: plan.planId,
      documentId: plan.documentId,
      status: plan.status,
      itemCount: plan.items.length,
      items: plan.items.map(toPublicPlanItem),
      privacyBlockers: plan.privacyBlockers,
      fidelityWarnings: plan.fidelityWarnings,
      warnings: plan.warnings,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    },
  };
}
