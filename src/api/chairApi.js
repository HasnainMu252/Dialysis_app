import api from './axios';
export const chairApi={ list:()=>api.get('/chairs'), create:(data)=>api.post('/chairs',data), updateStatus:(id,data)=>api.patch(`/chairs/${id}/status`,data) };
