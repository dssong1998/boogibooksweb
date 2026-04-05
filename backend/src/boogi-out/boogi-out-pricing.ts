export function feeMultiplier(feePercent: number): number {
  return 1 + feePercent / 100;
}

export function totalWithFee(base: number, feePercent: number): number {
  return Math.round(base * feeMultiplier(feePercent));
}

/** TOTAL 모드: 총 비용 기준, n명일 때 1인 부담(수수료 포함) */
export function perPersonFromTotalCost(
  totalCost: number,
  feePercent: number,
  participantCount: number,
): number {
  if (participantCount <= 0) return 0;
  return Math.round(totalWithFee(totalCost, feePercent) / participantCount);
}

/** PER_PERSON 모드: 1인 비용(수수료 전) → 1인 실제 부담(수수료 포함) */
export function perPersonFromPerPersonBase(
  basePerPerson: number,
  feePercent: number,
): number {
  return totalWithFee(basePerPerson, feePercent);
}

/** 총액 모드에서 10명 가정 시 1인당(최대 분담 표시용) */
export function perPersonIfTenApplicantsTotalMode(
  totalCost: number,
  feePercent: number,
): number {
  return perPersonFromTotalCost(totalCost, feePercent, 10);
}
