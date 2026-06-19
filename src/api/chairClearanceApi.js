import api from './axios';
export const chairClearanceApi={ list:(params)=>api.get('/chair-clearances',{params}), create:(chairCode,data)=>api.post(`/chair-clearances/${chairCode}`,data) };
