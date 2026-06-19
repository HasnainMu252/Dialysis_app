import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { patientApi } from '../../api/patientApi';
import { scheduleApi } from '../../api/scheduleApi';
import { sessionApi } from '../../api/sessionApi';
import { billingApi } from '../../api/billingApi';
import PatientJourneyPanel from '../../components/common/PatientJourneyPanel';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';

export default function PatientDashboard(){ const {user}=useAuth(); const [patient,setPatient]=useState(null); const [schedules,setSchedules]=useState([]); const [sessions,setSessions]=useState([]); const [claims,setClaims]=useState([]); useEffect(()=>{const load=async()=>{try{if(!user?.mrn && !user?.patientMrn) return; const p=await patientApi.get(user.mrn||user.patientMrn); const patientData=p.data?.data; setPatient(patientData); const [sc,se,cl]=await Promise.allSettled([scheduleApi.byPatient(patientData.mrn),sessionApi.list({patient:patientData._id}),billingApi.listClaims()]); if(sc.status==='fulfilled') setSchedules(sc.value.data?.schedules||[]); if(se.status==='fulfilled') setSessions(se.value.data?.data||[]); if(cl.status==='fulfilled') setClaims((cl.value.data?.data||[]).filter(c=>(c.patient?._id||c.patient)===patientData._id));}catch(e){toast.error(e?.response?.data?.message||'Failed to load patient portal')}}; load();},[user]); return <div className="space-y-5"><PageHeader title="Patient Dashboard" subtitle="My schedules, treatment history, vitals, SOAP notes and claims." />{patient?<PatientJourneyPanel patient={patient} schedules={schedules} sessions={sessions} claims={claims}/>:<EmptyState message="Patient profile not linked to this login yet."/>}</div>}
