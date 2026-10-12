import api from './axios';
export const billingApi={
  updateInsurance:(patientIdOrMrn,data)=>api.patch(`/billing/insurance/${patientIdOrMrn}`,data),
  listClaims:(params)=>api.get('/billing/claims',{params}),
  createClaim:(data)=>api.post('/billing/claims',data),
  getClaim:(id)=>api.get(`/billing/claims/${id}`),
  updateClaim:(id,data)=>api.patch(`/billing/claims/${id}`,data),
  // Phase D — activity logs (no fees)
  activity:(params)=>api.get('/billing/activity',{params}),
  daily:(params)=>api.get('/billing/daily',{params}),
  medReconciliation:(params)=>api.get('/billing/med-reconciliation',{params}),
};
